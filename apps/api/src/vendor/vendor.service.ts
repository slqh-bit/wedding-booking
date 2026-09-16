import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import type {
  AuthResponse,
  OfferingInput,
  ServiceCategory,
  VendorProfileInput,
  VendorRegisterInput,
} from '@hafalati/shared';
import { isDateBound } from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { toOfferingDTO, toUserDTO, toVendorDTO, decToNum } from '../http/serialize.js';
import { earningsForVendorId } from './earnings.js';
import { vendorRating } from '../reviews/reviews.service.js';

/** Resolve the vendor row owned by a user (throws if the user isn't a vendor). */
async function myVendor(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw AppError.forbidden('not_a_vendor', 'No vendor profile for this account');
  return vendor;
}

// ── Onboarding ──────────────────────────────────────────
export async function registerVendor(input: VendorRegisterInput): Promise<AuthResponse> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true },
  });
  if (existing) throw AppError.conflict('user_exists', 'Email or phone already registered');

  const passwordHash = await argon2.hash(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
      locale: input.locale ?? 'ar',
      role: 'VENDOR',
      vendor: {
        create: {
          name: input.vendorName,
          description: input.description,
          city: input.city,
          phone: input.phone,
          email: input.email,
          status: 'PENDING',
        },
      },
    },
  });

  return {
    user: toUserDTO(user),
    accessToken: signAccessToken({ sub: user.id, role: 'VENDOR' }),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function getMyVendor(userId: string) {
  return toVendorDTO(await myVendor(userId));
}

export async function updateMyVendor(userId: string, input: VendorProfileInput) {
  const vendor = await myVendor(userId);
  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    },
  });
  return toVendorDTO(updated);
}

// ── Offerings (owned) ───────────────────────────────────
export async function listMyOfferings(userId: string) {
  const vendor = await myVendor(userId);
  const offerings = await prisma.serviceOffering.findMany({
    where: { vendorId: vendor.id },
    include: { vendor: { select: { name: true } } },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  });
  return offerings.map((o) => toOfferingDTO(o));
}

export async function createMyOffering(userId: string, input: OfferingInput) {
  const vendor = await myVendor(userId);
  const offering = await prisma.serviceOffering.create({
    data: {
      vendorId: vendor.id,
      category: input.category as ServiceCategory,
      name: input.name as Prisma.InputJsonValue,
      description: input.description as Prisma.InputJsonValue,
      basePrice: new Prisma.Decimal(input.basePrice),
      emoji: input.emoji ?? '✨',
      attributes: (input.attributes ?? {}) as Prisma.InputJsonValue,
      imageUrls: input.imageUrls ?? [],
      isActive: input.isActive ?? true,
      moderationStatus: 'PENDING', // needs admin approval before going public
    },
    include: { vendor: { select: { name: true } } },
  });
  return toOfferingDTO(offering);
}

async function assertOwnedOffering(vendorId: string, offeringId: string) {
  const offering = await prisma.serviceOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.vendorId !== vendorId) {
    throw AppError.notFound('offering_not_found', 'Offering not found');
  }
  return offering;
}

export async function updateMyOffering(userId: string, id: string, input: Partial<OfferingInput>) {
  const vendor = await myVendor(userId);
  await assertOwnedOffering(vendor.id, id);
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
      // Any edit re-enters the moderation queue.
      moderationStatus: 'PENDING',
    },
    include: { vendor: { select: { name: true } } },
  });
  return toOfferingDTO(offering);
}

export async function deleteMyOffering(userId: string, id: string) {
  const vendor = await myVendor(userId);
  const existing = await assertOwnedOffering(vendor.id, id);
  const count = await prisma.bookingItem.count({ where: { offeringId: existing.id } });
  if (count > 0) {
    await prisma.serviceOffering.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }
  await prisma.serviceOffering.delete({ where: { id } });
  return { deleted: true };
}

// ── Availability (owned, date-bound) ────────────────────
export async function setAvailabilityRange(
  userId: string,
  offeringId: string,
  from: string,
  to: string,
  open: boolean,
) {
  const vendor = await myVendor(userId);
  const offering = await assertOwnedOffering(vendor.id, offeringId);
  if (!isDateBound(offering.category as ServiceCategory)) {
    throw AppError.badRequest('not_date_bound', 'This category has no date calendar');
  }
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (end < start) throw AppError.badRequest('bad_range', '`to` is before `from`');

  const dates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }

  if (open) {
    await prisma.$transaction(
      dates.map((date) =>
        prisma.availability.upsert({
          where: { offeringId_date: { offeringId, date } },
          // Never downgrade a BOOKED day back to AVAILABLE.
          update: {},
          create: { offeringId, date, status: 'AVAILABLE' },
        }),
      ),
    );
  } else {
    // Close only days that aren't already booked.
    await prisma.availability.deleteMany({
      where: { offeringId, date: { in: dates }, status: { not: 'BOOKED' } },
    });
  }
  return { updated: dates.length };
}

// ── Bookings + stats (attributed to this vendor's items) ─
export async function listMyBookings(userId: string) {
  const vendor = await myVendor(userId);
  const bookings = await prisma.booking.findMany({
    where: { items: { some: { offering: { vendorId: vendor.id } } } },
    include: {
      items: {
        where: { offering: { vendorId: vendor.id } },
        include: { offering: { select: { emoji: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    eventDate: b.eventDate.toISOString().slice(0, 10),
    eventType: b.eventType,
    status: b.status,
    items: b.items.map((i) => ({
      category: i.category,
      emoji: i.offering?.emoji ?? '✨',
      name: i.snapshot,
      unitPrice: decToNum(i.unitPrice),
    })),
    vendorSubtotal: b.items.reduce((s, i) => s + decToNum(i.unitPrice), 0),
  }));
}

export async function myEarnings(userId: string) {
  const vendor = await myVendor(userId);
  return earningsForVendorId(vendor.id);
}

export async function vendorStats(userId: string) {
  const vendor = await myVendor(userId);
  const [byModeration, itemAgg, bookingCount, rating] = await Promise.all([
    prisma.serviceOffering.groupBy({
      by: ['moderationStatus'],
      where: { vendorId: vendor.id },
      _count: { _all: true },
    }),
    prisma.bookingItem.aggregate({
      where: {
        offering: { vendorId: vendor.id },
        booking: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      },
      _sum: { unitPrice: true },
    }),
    prisma.booking.count({
      where: { items: { some: { offering: { vendorId: vendor.id } } } },
    }),
    vendorRating(vendor.id),
  ]);

  const offerings: Record<string, number> = {};
  for (const row of byModeration) offerings[row.moderationStatus] = row._count._all;
  const grossRevenue = itemAgg._sum.unitPrice ? decToNum(itemAgg._sum.unitPrice) : 0;

  return {
    status: vendor.status,
    commissionRate: decToNum(vendor.commissionRate),
    offeringsByModeration: offerings,
    bookings: bookingCount,
    grossRevenue,
    estimatedCommission: Math.round(grossRevenue * decToNum(vendor.commissionRate) * 1000) / 1000,
    estimatedNet: Math.round(grossRevenue * (1 - decToNum(vendor.commissionRate)) * 1000) / 1000,
    ratingAvg: rating.avg,
    ratingCount: rating.count,
  };
}
