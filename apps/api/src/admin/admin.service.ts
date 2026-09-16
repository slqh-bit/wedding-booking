import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import {
  type AdminVendorCreateInput,
  type BookingStatus,
  type ModerationStatus,
  type OfferingInput,
  type RecordPaymentInput,
  type ServiceCategory,
  type VendorStatus,
} from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toBookingDTO, toOfferingDTO, toVendorDTO } from '../http/serialize.js';
import { settlePayment } from '../payments/payment.service.js';
import { earningsForVendorId, payoutSummaries, settleVendorPayout } from '../vendor/earnings.js';

export { listNotifications } from '../notifications/notification.service.js';

// ── Offerings CRUD ──────────────────────────────────────
async function platformVendorId(): Promise<string> {
  const vendor = await prisma.vendor.findFirst({ where: { isPlatformOwned: true } });
  if (!vendor) throw AppError.badRequest('no_vendor', 'Platform vendor not seeded');
  return vendor.id;
}

export async function listAllOfferings(moderationStatus?: ModerationStatus) {
  const offerings = await prisma.serviceOffering.findMany({
    where: moderationStatus ? { moderationStatus } : {},
    include: { vendor: { select: { name: true } } },
    orderBy: [{ category: 'asc' }, { basePrice: 'asc' }],
  });
  return offerings.map(toOfferingDTO);
}

// ── Vendors + moderation (Phase 3) ──────────────────────
const vendorSelect = {
  id: true,
  name: true,
  description: true,
  logoUrl: true,
  phone: true,
  email: true,
  city: true,
  status: true,
  isPlatformOwned: true,
  commissionRate: true,
  createdAt: true,
  _count: { select: { offerings: true } },
} satisfies Prisma.VendorSelect;

export async function listVendors(status?: VendorStatus) {
  const vendors = await prisma.vendor.findMany({
    where: status ? { status } : {},
    select: vendorSelect,
    orderBy: { createdAt: 'desc' },
  });
  return vendors.map(toVendorDTO);
}

export async function createVendor(input: AdminVendorCreateInput) {
  const vendor = await prisma.vendor.create({
    data: {
      name: input.vendorName,
      description: input.description,
      phone: input.phone,
      city: input.city,
      status: 'APPROVED', // admin-created vendors are trusted
      ...(input.commissionRate !== undefined
        ? { commissionRate: new Prisma.Decimal(input.commissionRate) }
        : {}),
      ...(input.owner
        ? {
            owner: {
              create: {
                email: input.owner.email,
                phone: input.owner.phone,
                fullName: input.owner.fullName,
                passwordHash: await argon2.hash(input.owner.password),
                role: 'VENDOR',
              },
            },
          }
        : {}),
    },
    select: vendorSelect,
  });
  return toVendorDTO(vendor);
}

export async function setVendorStatus(vendorId: string, status: VendorStatus) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw AppError.notFound('vendor_not_found', 'Vendor not found');
  if (vendor.isPlatformOwned) {
    throw AppError.conflict('platform_vendor', 'The platform vendor status is fixed');
  }
  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { status },
    select: vendorSelect,
  });
  return toVendorDTO(updated);
}

export async function setOfferingModeration(offeringId: string, status: ModerationStatus) {
  const offering = await prisma.serviceOffering.findUnique({ where: { id: offeringId } });
  if (!offering) throw AppError.notFound('offering_not_found', 'Offering not found');
  const updated = await prisma.serviceOffering.update({
    where: { id: offeringId },
    data: { moderationStatus: status },
    include: { vendor: { select: { name: true } } },
  });
  return toOfferingDTO(updated);
}

// ── Payouts (Phase 3 slice 2, reporting) ────────────────
export async function listPayouts() {
  return payoutSummaries();
}

export async function getVendorPayout(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw AppError.notFound('vendor_not_found', 'Vendor not found');
  return earningsForVendorId(vendorId);
}

export async function settlePayout(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw AppError.notFound('vendor_not_found', 'Vendor not found');
  return settleVendorPayout(vendorId);
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

/**
 * Confirm a pending payment (admin manual action). Delegates to the shared
 * `settlePayment` so the offline and gateway paths issue invoices identically.
 */
export async function confirmPayment(paymentId: string, adminId: string) {
  return settlePayment(paymentId, { adminId });
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
