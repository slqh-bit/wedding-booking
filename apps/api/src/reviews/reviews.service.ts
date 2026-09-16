import type { ReviewInput } from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toReviewDTO } from '../http/serialize.js';

/**
 * Aggregate published-review ratings for a set of offerings.
 * Returns a Map keyed by offeringId → { avg (1 decimal), count }.
 * Reused by the catalog to surface stars, and by vendor rollups.
 */
export async function offeringRatings(
  offeringIds: string[],
): Promise<Map<string, { avg: number; count: number }>> {
  const map = new Map<string, { avg: number; count: number }>();
  if (offeringIds.length === 0) return map;

  const rows = await prisma.review.groupBy({
    by: ['offeringId'],
    where: { offeringId: { in: offeringIds }, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const r of rows) {
    map.set(r.offeringId, {
      avg: Math.round((r._avg.rating ?? 0) * 10) / 10,
      count: r._count._all,
    });
  }
  return map;
}

/** The single published-review average across all of a vendor's offerings. */
export async function vendorRating(vendorId: string): Promise<{ avg: number; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { status: 'PUBLISHED', offering: { vendorId } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return {
    avg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    count: agg._count._all,
  };
}

/**
 * Create or update the caller's review of an offering. Allowed only when the
 * user has a COMPLETED booking that included that offering (proof of purchase).
 * One editable review per (user, offering); a later call updates it in place.
 */
export async function submitReview(userId: string, input: ReviewInput) {
  const eligibleBooking = await prisma.booking.findFirst({
    where: {
      userId,
      status: 'COMPLETED',
      items: { some: { offeringId: input.offeringId } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (!eligibleBooking) {
    throw AppError.forbidden(
      'not_eligible',
      'You can only review a service after a completed booking that included it',
    );
  }

  const review = await prisma.review.upsert({
    where: { userId_offeringId: { userId, offeringId: input.offeringId } },
    // A re-review re-publishes (an edit clears a prior HIDDEN? No — keep status
    // as-is on update so a hidden review stays hidden). Only content changes.
    update: { rating: input.rating, comment: input.comment ?? null },
    create: {
      userId,
      offeringId: input.offeringId,
      bookingId: eligibleBooking.id,
      rating: input.rating,
      comment: input.comment ?? null,
    },
    include: { offering: { select: { name: true } } },
  });
  return toReviewDTO(review);
}

/** The caller's own reviews (any status), newest first. */
export async function listMyReviews(userId: string) {
  const rows = await prisma.review.findMany({
    where: { userId },
    include: { offering: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toReviewDTO);
}

/** Public published reviews for an offering, newest first. */
export async function listOfferingReviews(offeringId: string) {
  const rows = await prisma.review.findMany({
    where: { offeringId, status: 'PUBLISHED' },
    include: { user: { select: { fullName: true } }, offering: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map(toReviewDTO);
}

// ── Admin moderation ────────────────────────────────────
export async function listReviews(status?: 'PUBLISHED' | 'HIDDEN') {
  const rows = await prisma.review.findMany({
    where: status ? { status } : {},
    include: { user: { select: { fullName: true } }, offering: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map(toReviewDTO);
}

export async function setReviewStatus(id: string, status: 'PUBLISHED' | 'HIDDEN') {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('review_not_found', 'Review not found');
  const updated = await prisma.review.update({
    where: { id },
    data: { status },
    include: { user: { select: { fullName: true } }, offering: { select: { name: true } } },
  });
  return toReviewDTO(updated);
}
