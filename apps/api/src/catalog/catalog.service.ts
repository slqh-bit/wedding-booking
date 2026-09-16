import { CATEGORY_META, CATEGORY_ORDER, type CategoryDTO, type ServiceCategory } from '@hafalati/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toOfferingDTO } from '../http/serialize.js';

/**
 * The single visibility rule for the public catalog: an offering shows only
 * when it is active, moderation-approved, and its vendor is platform-owned or
 * an approved vendor. Reused across every public query so a suspended vendor or
 * a pending offering silently drops out of the wizard.
 */
export const PUBLIC_OFFERING_WHERE = {
  isActive: true,
  moderationStatus: 'APPROVED',
  vendor: { OR: [{ isPlatformOwned: true }, { status: 'APPROVED' }] },
} satisfies Prisma.ServiceOfferingWhereInput;

export async function listCategories(): Promise<CategoryDTO[]> {
  const counts = await prisma.serviceOffering.groupBy({
    by: ['category'],
    where: PUBLIC_OFFERING_WHERE,
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.category, c._count._all]));

  return CATEGORY_ORDER.map((category) => {
    const meta = CATEGORY_META[category];
    return {
      category,
      order: meta.order,
      emoji: meta.emoji,
      label: meta.label,
      count: countMap.get(category) ?? 0,
    };
  });
}

export async function listOfferings(category?: ServiceCategory) {
  const offerings = await prisma.serviceOffering.findMany({
    where: { ...PUBLIC_OFFERING_WHERE, ...(category ? { category } : {}) },
    include: { vendor: { select: { name: true } } },
    orderBy: { basePrice: 'asc' },
  });
  return offerings.map(toOfferingDTO);
}

export async function getOffering(id: string) {
  const offering = await prisma.serviceOffering.findFirst({
    where: { id, ...PUBLIC_OFFERING_WHERE },
    include: { vendor: { select: { name: true } } },
  });
  if (!offering) {
    throw AppError.notFound('offering_not_found', 'Offering not found');
  }
  return toOfferingDTO(offering);
}

/** Availability for a given month (YYYY-MM) for a date-bound offering. */
export async function getAvailability(offeringId: string, month: string) {
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon || mon < 1 || mon > 12) {
    throw AppError.badRequest('invalid_month', 'month must be YYYY-MM');
  }
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const rows = await prisma.availability.findMany({
    where: { offeringId, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  });

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
  }));
}
