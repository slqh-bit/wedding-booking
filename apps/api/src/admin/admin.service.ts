import { Prisma } from '@prisma/client';
import {
  computeTotals,
  type BookingStatus,
  type OfferingInput,
  type RecordPaymentInput,
  type ServiceCategory,
} from '@hafalati/shared';
import { prisma } from '../db.js';
import { fiscalConfig } from '../env.js';
import { AppError } from '../http/errors.js';
import { toBookingDTO, toOfferingDTO } from '../http/serialize.js';

// ── Offerings CRUD ──────────────────────────────────────
async function platformVendorId(): Promise<string> {
  const vendor = await prisma.vendor.findFirst({ where: { isPlatformOwned: true } });
  if (!vendor) throw AppError.badRequest('no_vendor', 'Platform vendor not seeded');
  return vendor.id;
}

export async function listAllOfferings() {
  const offerings = await prisma.serviceOffering.findMany({
    include: { vendor: { select: { name: true } } },
    orderBy: [{ category: 'asc' }, { basePrice: 'asc' }],
  });
  return offerings.map(toOfferingDTO);
}

export async function createOffering(input: OfferingInput) {
  const offering = await prisma.serviceOffering.create({
    data: {
      vendorId: await platformVendorId(),
      category: input.category as ServiceCategory,
      name: input.name as Prisma.InputJsonValue,
      description: input.description as Prisma.InputJsonValue,
      basePrice: new Prisma.Decimal(input.basePrice),
      emoji: input.emoji ?? '✨',
      attributes: (input.attributes ?? {}) as Prisma.InputJsonValue,
      imageUrls: input.imageUrls ?? [],
      isActive: input.isActive ?? true,
    },
    include: { vendor: { select: { name: true } } },
  });
  return toOfferingDTO(offering);
}

export async function updateOffering(id: string, input: Partial<OfferingInput>) {
  const existing = await prisma.serviceOffering.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('offering_not_found', 'Offering not found');

  const offering = await prisma.serviceOffering.update({
    where: { id },
    data: {
      ...(input.category ? { category: input.category as ServiceCategory } : {}),
      ...(input.name ? { name: input.name as Prisma.InputJsonValue } : {}),
      ...(input.description ? { description: input.description as Prisma.InputJsonValue } : {}),
      ...(input.basePrice !== undefined ? { basePrice: new Prisma.Decimal(input.basePrice) } : {}),
      ...(input.emoji ? { emoji: input.emoji } : {}),
      ...(input.attributes ? { attributes: input.attributes as Prisma.InputJsonValue } : {}),
      ...(input.imageUrls ? { imageUrls: input.imageUrls } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { vendor: { select: { name: true } } },
  });
  return toOfferingDTO(offering);
}

export async function deleteOffering(id: string) {
  const existing = await prisma.serviceOffering.findUnique({
    where: { id },
    include: { _count: { select: { bookingItems: true } } },
  });
  if (!existing) throw AppError.notFound('offering_not_found', 'Offering not found');

  // Preserve history: soft-deactivate if it has bookings, hard-delete otherwise.
  if (existing._count.bookingItems > 0) {
    await prisma.serviceOffering.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }
  await prisma.serviceOffering.delete({ where: { id } });
  return { deleted: true };
}

// ── Bookings ────────────────────────────────────────────
const bookingInclude = {
  items: { include: { offering: { select: { emoji: true } } } },
  payments: true,
} satisfies Prisma.BookingInclude;

export async function listBookings(status?: BookingStatus) {
  const bookings = await prisma.booking.findMany({
    where: status ? { status } : {},
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  return bookings.map(toBookingDTO);
}

export async function setBookingStatus(bookingId: string, status: BookingStatus) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw AppError.notFound('booking_not_found', 'Booking not found');
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: bookingInclude,
  });
  return toBookingDTO(updated);
}

// ── Payments ────────────────────────────────────────────
export async function recordPayment(bookingId: string, input: RecordPaymentInput) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw AppError.notFound('booking_not_found', 'Booking not found');

  await prisma.payment.create({
    data: {
      bookingId,
      amount: new Prisma.Decimal(input.amount),
      method: input.method,
      status: 'PENDING',
      reference: input.reference,
    },
  });
  return getBookingWithPayments(bookingId);
}

/** Confirm a pending payment → mark PAID, confirm booking, issue invoice. */
export async function confirmPayment(paymentId: string, adminId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: bookingInclude } },
  });
  if (!payment) throw AppError.notFound('payment_not_found', 'Payment not found');
  if (payment.status === 'CONFIRMED') {
    throw AppError.conflict('already_confirmed', 'Payment already confirmed');
  }

  const booking = payment.booking;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'CONFIRMED', confirmedByAdminId: adminId },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED', depositStatus: 'PAID' },
    });

    const existingInvoice = await tx.invoice.findUnique({ where: { bookingId: booking.id } });
    if (!existingInvoice) {
      const fiscal = computeTotals(
        booking.items.map((i) => ({ unitPrice: Number(i.unitPrice) })),
        fiscalConfig,
      );
      const year = new Date().getUTCFullYear();
      const count = await tx.invoice.count();
      const number = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      await tx.invoice.create({
        data: {
          bookingId: booking.id,
          number,
          subtotal: new Prisma.Decimal(fiscal.subtotal),
          tva: new Prisma.Decimal(fiscal.tva),
          timbreFiscal: new Prisma.Decimal(fiscal.timbreFiscal),
          total: new Prisma.Decimal(fiscal.total),
        },
      });
    }
  });

  return getBookingWithPayments(booking.id);
}

async function getBookingWithPayments(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: bookingInclude,
  });
  return toBookingDTO(booking);
}

// ── Dashboard ───────────────────────────────────────────
export async function dashboardStats() {
  const [byStatus, revenue, upcoming, offeringCount, customerCount] = await Promise.all([
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.booking.aggregate({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      _sum: { total: true },
    }),
    prisma.booking.count({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, eventDate: { gte: new Date() } },
    }),
    prisma.serviceOffering.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) statusCounts[row.status] = row._count._all;

  return {
    bookingsByStatus: statusCounts,
    confirmedRevenue: revenue._sum.total ? Number(revenue._sum.total) : 0,
    upcomingEvents: upcoming,
    activeOfferings: offeringCount,
    customers: customerCount,
  };
}
