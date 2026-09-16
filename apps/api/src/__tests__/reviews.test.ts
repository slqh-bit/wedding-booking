/**
 * Phase 3 slice 3 — reviews & ratings.
 * A customer can review an offering only after a COMPLETED booking that
 * included it; published reviews aggregate into the public catalog; admin can
 * hide a review, which drops it from the aggregate + public list.
 * Requires Postgres running + seeded.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Review Tester',
  email: `rev_${unique}@hafalati.tn`,
  phone: `+2167${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let adminToken = '';
let userId = '';
let bookingId = '';
let eligibleOfferingId = '';
let ineligibleOfferingId = '';
let reviewId = '';

async function catalogRating(category: string, offeringId: string) {
  const res = await request(app).get(`/api/v1/offerings?category=${category}`);
  const o = res.body.data.find((x: { id: string }) => x.id === offeringId);
  return o ? { avg: o.ratingAvg as number, count: o.ratingCount as number } : null;
}

beforeAll(async () => {
  const reg = await request(app).post('/api/v1/auth/register').send(customer);
  token = reg.body.accessToken;
  userId = reg.body.user.id;
  adminToken = (
    await request(app).post('/api/v1/auth/login').send({ email: 'admin@hafalati.tn', password: 'Admin1234' })
  ).body.accessToken;

  const catering = await prisma.serviceOffering.findFirst({
    where: { category: 'CATERING', vendor: { isPlatformOwned: true } },
  });
  eligibleOfferingId = catering!.id;
  const cake = await prisma.serviceOffering.findFirst({
    where: { category: 'CAKE', vendor: { isPlatformOwned: true } },
  });
  ineligibleOfferingId = cake!.id;

  // A COMPLETED booking with the catering offering unlocks its review.
  const booking = await prisma.booking.create({
    data: {
      reference: `HF-REV${String(unique).slice(-5)}`,
      userId,
      eventDate: new Date('2026-01-01'),
      eventType: 'WEDDING',
      status: 'COMPLETED',
      subtotal: new Prisma.Decimal(1000),
      tva: new Prisma.Decimal(190),
      timbreFiscal: new Prisma.Decimal(1),
      total: new Prisma.Decimal(1191),
      depositAmount: new Prisma.Decimal(357.3),
      depositStatus: 'PAID',
      items: {
        create: [
          {
            offeringId: eligibleOfferingId,
            category: 'CATERING',
            unitPrice: new Prisma.Decimal(1000),
            snapshot: { ar: 'ضيافة', fr: 'Traiteur', en: 'Catering' } as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.review.deleteMany({ where: { userId } });
  await prisma.booking.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('reviews & ratings', () => {
  it('rejects a review of an offering the user never completed', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ offeringId: ineligibleOfferingId, rating: 5 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('not_eligible');
  });

  it('accepts a review after a completed booking', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ offeringId: eligibleOfferingId, rating: 4, comment: 'Great food' });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
    reviewId = res.body.id;

    const rating = await catalogRating('CATERING', eligibleOfferingId);
    expect(rating).toEqual({ avg: 4, count: 1 });
  });

  it('upserts instead of duplicating on re-review', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ offeringId: eligibleOfferingId, rating: 2, comment: 'Changed my mind' });
    expect(res.status).toBe(201);

    const count = await prisma.review.count({ where: { userId, offeringId: eligibleOfferingId } });
    expect(count).toBe(1);
    const rating = await catalogRating('CATERING', eligibleOfferingId);
    expect(rating).toEqual({ avg: 2, count: 1 });
  });

  it('lists the review publicly and to the author', async () => {
    const pub = await request(app).get(`/api/v1/offerings/${eligibleOfferingId}/reviews`);
    expect(pub.body.data.some((r: { id: string }) => r.id === reviewId)).toBe(true);

    const mine = await request(app).get('/api/v1/reviews/mine').set('Authorization', `Bearer ${token}`);
    expect(mine.body.data.some((r: { id: string }) => r.id === reviewId)).toBe(true);
  });

  it('hides a review from the aggregate + public list when admin hides it', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIDDEN' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HIDDEN');

    const rating = await catalogRating('CATERING', eligibleOfferingId);
    expect(rating).toEqual({ avg: 0, count: 0 });

    const pub = await request(app).get(`/api/v1/offerings/${eligibleOfferingId}/reviews`);
    expect(pub.body.data.some((r: { id: string }) => r.id === reviewId)).toBe(false);
  });

  it('a customer cannot moderate reviews', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' });
    expect(res.status).toBe(403);
  });
});
