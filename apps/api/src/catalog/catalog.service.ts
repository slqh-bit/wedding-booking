import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type CategoryDTO,
  type OfferingDTO,
  type Paginated,
  type SearchQuery,
  type ServiceCategory,
} from '@hafalati/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toOfferingDTO } from '../http/serialize.js';
import { offeringRatings } from '../reviews/reviews.service.js';
import { dateLimitedSet } from './category-config.service.js';

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

export async function listOfferings(category?: ServiceCategory, date?: string) {
  // For a date-limited category with a chosen date, hide offerings already
  // reserved (BOOKED/HELD) on that whole day.
  let dateFilter: Prisma.ServiceOfferingWhereInput = {};
  if (category && date) {
    const limited = await dateLimitedSet();
    if (limited.has(category)) {
      dateFilter = {
        NOT: {
          availability: {
            some: { date: new Date(`${date}T00:00:00.000Z`), status: { in: ['BOOKED', 'HELD'] } },
          },
        },
      };
    }
  }

  const offerings = await prisma.serviceOffering.findMany({
    where: { ...PUBLIC_OFFERING_WHERE, ...(category ? { category } : {}), ...dateFilter },
    include: { vendor: { select: { name: true } } },
    orderBy: { basePrice: 'asc' },
  });
  const ratings = await offeringRatings(offerings.map((o) => o.id));
  return offerings.map((o) => toOfferingDTO(o, ratings.get(o.id)));
}

/**
 * Given a date + candidate offering ids, return the ids that are no longer
 * bookable on that date (reserved on a date-limited category). Used to prune a
 * customer's selections when they change the event date.
 */
export async function unavailableForDate(date: string, offeringIds: string[]): Promise<string[]> {
  if (offeringIds.length === 0) return [];
  const day = new Date(`${date}T00:00:00.000Z`);
  const limited = await dateLimitedSet();
  const offerings = await prisma.serviceOffering.findMany({
    where: { id: { in: offeringIds } },
    select: { id: true, category: true },
  });
  const limitedIds = offerings.filter((o) => limited.has(o.category as ServiceCategory)).map((o) => o.id);
  if (limitedIds.length === 0) return [];
  const taken = await prisma.availability.findMany({
    where: { offeringId: { in: limitedIds }, date: day, status: { in: ['BOOKED', 'HELD'] } },
    select: { offeringId: true },
  });
  return [...new Set(taken.map((t) => t.offeringId))];
}

export async function getOffering(id: string) {
  const offering = await prisma.serviceOffering.findFirst({
    where: { id, ...PUBLIC_OFFERING_WHERE },
    include: { vendor: { select: { name: true } } },
  });
  if (!offering) {
    throw AppError.notFound('offering_not_found', 'Offering not found');
  }
  const ratings = await offeringRatings([offering.id]);
  return toOfferingDTO(offering, ratings.get(offering.id));
}

/** Lowercased text of every locale in a LocalizedString JSON blob. */
function localizedText(json: unknown): string {
  const v = (json ?? {}) as Record<string, unknown>;
  return [v.ar, v.fr, v.en]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();
}

/**
 * Public catalog search. DB filters what it can (visibility, category, price);
 * ratings, free-text match, min-rating and rating sort are applied in app
 * (the public catalog is small, and rating is an aggregate of a relation).
 * Returns a paginated slice with the same rating-enriched OfferingDTO.
 */
export async function searchOfferings(params: SearchQuery): Promise<Paginated<OfferingDTO>> {
  const priceFilter: Prisma.DecimalFilter = {};
  if (params.minPrice !== undefined) priceFilter.gte = params.minPrice;
  if (params.maxPrice !== undefined) priceFilter.lte = params.maxPrice;

  const rows = await prisma.serviceOffering.findMany({
    where: {
      ...PUBLIC_OFFERING_WHERE,
      ...(params.category ? { category: params.category as ServiceCategory } : {}),
      ...(params.minPrice !== undefined || params.maxPrice !== undefined
        ? { basePrice: priceFilter }
        : {}),
    },
    include: { vendor: { select: { name: true } } },
  });

  const ratings = await offeringRatings(rows.map((o) => o.id));

  // Free-text (any locale, name + description) + minimum rating.
  const q = params.q?.trim().toLowerCase();
  let items = rows
    .map((o) => ({ row: o, rating: ratings.get(o.id) ?? { avg: 0, count: 0 } }))
    .filter(({ row }) => {
      if (!q) return true;
      return localizedText(row.name).includes(q) || localizedText(row.description).includes(q);
    })
    .filter(({ rating }) => (params.minRating ? rating.avg >= params.minRating : true));

  // Sort.
  items.sort((a, b) => {
    switch (params.sort) {
      case 'price_asc':
        return Number(a.row.basePrice) - Number(b.row.basePrice);
      case 'price_desc':
        return Number(b.row.basePrice) - Number(a.row.basePrice);
      case 'rating_desc':
        return b.rating.avg - a.rating.avg || b.rating.count - a.rating.count;
      case 'newest':
      default:
        return b.row.createdAt.getTime() - a.row.createdAt.getTime();
    }
  });

  const total = items.length;
  const start = (params.page - 1) * params.pageSize;
  const pageItems = items.slice(start, start + params.pageSize);

  return {
    data: pageItems.map(({ row, rating }) => toOfferingDTO(row, rating)),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
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
