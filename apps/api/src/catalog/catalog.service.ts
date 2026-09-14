import { CATEGORY_META, CATEGORY_ORDER, type CategoryDTO, type ServiceCategory } from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toOfferingDTO } from '../http/serialize.js';

export async function listCategories(): Promise<CategoryDTO[]> {
  const counts = await prisma.serviceOffering.groupBy({
    by: ['category'],
    where: { isActive: true },
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
    where: { isActive: true, ...(category ? { category } : {}) },
    include: { vendor: { select: { name: true } } },
    orderBy: { basePrice: 'asc' },
  });
  return offerings.map(toOfferingDTO);
}

export async function getOffering(id: string) {
  const offering = await prisma.serviceOffering.findUnique({
    where: { id },
    include: { vendor: { select: { name: true } } },
  });
  if (!offering || !offering.isActive) {
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
