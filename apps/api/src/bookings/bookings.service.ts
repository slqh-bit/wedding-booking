import { Prisma } from '@prisma/client';
import { computeTotals, type CreateBookingInput, type ServiceCategory } from '@hafalati/shared';
import { prisma } from '../db.js';
import { fiscalConfig } from '../env.js';
import { AppError } from '../http/errors.js';
import { toBookingDTO } from '../http/serialize.js';
import { notifyBookingReceived } from '../notifications/notification.service.js';
import { resolvePackageForBooking } from '../packages/packages.service.js';
import { dateLimitedSet } from '../catalog/category-config.service.js';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const bookingInclude = {
  items: { include: { offering: { select: { emoji: true } } } },
  payments: true,
} satisfies Prisma.BookingInclude;

function generateReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HF-${s}`;
}

function parseEventDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Create a DRAFT booking from wizard selections. Totals are computed server-side. */
export async function createBooking(userId: string, input: CreateBookingInput) {
  const eventDate = parseEventDate(input.eventDate);

  // A promo package supplies its own offerings + a discount; otherwise the
  // wizard sends explicit offering ids at full price.
  let discountRate = 0;
  let offerings;
  if (input.packageId) {
    const resolved = await resolvePackageForBooking(input.packageId);
    discountRate = resolved.discountRate;
    offerings = resolved.offerings;
  } else {
    offerings = await prisma.serviceOffering.findMany({
      where: { id: { in: input.offeringIds }, isActive: true },
    });
    if (offerings.length !== input.offeringIds.length) {
      throw AppError.badRequest('invalid_offering', 'One or more offerings are unavailable');
    }
  }

  // One selection per category.
  const seen = new Set<ServiceCategory>();
  for (const o of offerings) {
    const cat = o.category as ServiceCategory;
    if (seen.has(cat)) {
      throw AppError.badRequest('duplicate_category', `Multiple selections for ${cat}`);
    }
    seen.add(cat);
  }

  // Verify date-bound offerings are free on the event date.
  await assertDatesAvailable(offerings, eventDate);

  // Discounted unit price flows through the fiscal engine (TVA/timbre/deposit).
  const priced = offerings.map((o) => ({ o, unitPrice: round3(Number(o.basePrice) * (1 - discountRate)) }));
  const fiscal = computeTotals(
    priced.map((p) => ({ unitPrice: p.unitPrice })),
    fiscalConfig,
  );

  const booking = await prisma.booking.create({
    data: {
      reference: generateReference(),
      userId,
      packageId: input.packageId ?? null,
      eventDate,
      eventType: input.eventType,
      status: 'DRAFT',
      subtotal: new Prisma.Decimal(fiscal.subtotal),
      tva: new Prisma.Decimal(fiscal.tva),
      timbreFiscal: new Prisma.Decimal(fiscal.timbreFiscal),
      total: new Prisma.Decimal(fiscal.total),
      depositAmount: new Prisma.Decimal(fiscal.deposit),
      notes: input.notes,
      items: {
        create: priced.map(({ o, unitPrice }) => ({
          offeringId: o.id,
          category: o.category,
          unitPrice: new Prisma.Decimal(unitPrice),
          snapshot: o.name as Prisma.InputJsonValue,
        })),
      },
    },
    include: bookingInclude,
  });

  return toBookingDTO(booking);
}

async function assertDatesAvailable(
  offerings: { id: string; category: string }[],
  eventDate: Date,
) {
  const limited = await dateLimitedSet();
  const dateBound = offerings.filter((o) => limited.has(o.category as ServiceCategory));
  if (dateBound.length === 0) return;

  const rows = await prisma.availability.findMany({
    where: { offeringId: { in: dateBound.map((o) => o.id) }, date: eventDate },
  });
  const byOffering = new Map(rows.map((r) => [r.offeringId, r.status]));

  for (const o of dateBound) {
    const status = byOffering.get(o.id);
    if (status === 'BOOKED' || status === 'HELD') {
      throw AppError.conflict('date_unavailable', 'Selected date is not available for an item', {
        offeringId: o.id,
      });
    }
  }
}

/** Confirm a DRAFT booking → PENDING, lock availability, create a deposit payment record. */
export async function confirmBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });
  if (!booking || booking.userId !== userId) {
    throw AppError.notFound('booking_not_found', 'Booking not found');
  }
  if (booking.status !== 'DRAFT') {
    throw AppError.conflict('invalid_status', 'Only draft bookings can be confirmed');
  }

  const limited = await dateLimitedSet();
  const dateBoundOfferingIds = booking.items
    .filter((i) => limited.has(i.category as ServiceCategory))
    .map((i) => i.offeringId);

  const updated = await prisma.$transaction(async (tx) => {
    // Re-check + lock availability inside the transaction to avoid races. Upsert
    // so the date is locked even when no availability row was pre-created.
    for (const offeringId of dateBoundOfferingIds) {
      const key = { offeringId_date: { offeringId, date: booking.eventDate } };
      const existing = await tx.availability.findUnique({ where: key });
      if (existing?.status === 'BOOKED') {
        throw AppError.conflict('date_unavailable', 'Selected date was just booked');
      }
      await tx.availability.upsert({
        where: key,
        update: { status: 'BOOKED' },
        create: { offeringId, date: booking.eventDate, status: 'BOOKED' },
      });
    }

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.depositAmount,
        method: 'BANK_TRANSFER',
        status: 'PENDING',
      },
    });

    return tx.booking.update({
      where: { id: booking.id },
      data: { status: 'PENDING' },
      include: bookingInclude,
    });
  });

  // Best-effort "booking received" email (never blocks/fails the confirmation).
  await notifyBookingReceived(updated.id);

  return toBookingDTO(updated);
}

/** Cancel a booking and release any locked dates. */
export async function cancelBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });
  if (!booking || booking.userId !== userId) {
    throw AppError.notFound('booking_not_found', 'Booking not found');
  }
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    throw AppError.conflict('invalid_status', 'Booking cannot be cancelled');
  }

  const limited = await dateLimitedSet();
  const dateBoundOfferingIds = booking.items
    .filter((i) => limited.has(i.category as ServiceCategory))
    .map((i) => i.offeringId);

  const updated = await prisma.$transaction(async (tx) => {
    if (dateBoundOfferingIds.length > 0) {
      await tx.availability.updateMany({
        where: {
          offeringId: { in: dateBoundOfferingIds },
          date: booking.eventDate,
          status: 'BOOKED',
        },
        data: { status: 'AVAILABLE' },
      });
    }
    return tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
      include: bookingInclude,
    });
  });

  return toBookingDTO(updated);
}

export async function listMyBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  return bookings.map(toBookingDTO);
}

export async function getBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });
  if (!booking || booking.userId !== userId) {
    throw AppError.notFound('booking_not_found', 'Booking not found');
  }
  return toBookingDTO(booking);
}
