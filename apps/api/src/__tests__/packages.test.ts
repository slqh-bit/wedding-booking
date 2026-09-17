/**
 * Phase 3 slice 5 — curated promo packages ("الباقات").
 * Public listing computes discounted totals; booking with a packageId applies
 * the discount through the fiscal engine; admin CRUD; inactive/hidden guards.
 * Requires Postgres running + seeded.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Package Buyer',
  email: `pkg_${unique}@hafalati.tn`,
  phone: `+2166${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let adminToken = '';
let userId = '';
const round3 = (n: number) => Math.round(n * 1000) / 1000;

beforeAll(async () => {
  const reg = await request(app).post('/api/v1/auth/register').send(customer);
  token = reg.body.accessToken;
  userId = reg.body.user.id;
  adminToken = (
    await request(app).post('/api/v1/auth/login').send({ email: 'admin@hafalati.tn', password: 'Admin1234' })
  ).body.accessToken;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('promo packages', () => {
  it('lists packages with a correct discounted total', async () => {
    const res = await request(app).get('/api/v1/packages');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(p.offerings.length).toBeGreaterThanOrEqual(2);
      expect(p.discountedTotal).toBe(round3(p.originalTotal * (1 - p.discountRate)));
      expect(p.savings).toBe(round3(p.originalTotal - p.discountedTotal));
      expect(p.discountedTotal).toBeLessThan(p.originalTotal);
    }
  });

  it('books a package at the discounted price (through the fiscal engine)', async () => {
    // Use a product-only package (CAKE + FLOWERS — no date lock) so the booking
    // is deterministic and never collides with other tests' availability.
    const created = await request(app)
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(await sampleInput()); // 0.2 discount, two product offerings
    const target = created.body;

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventDate: '2027-02-20', eventType: 'ENGAGEMENT', packageId: target.id });
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(target.offerings.length);
    // Each item's unit price is discounted, so the subtotal is the package's discounted total.
    expect(res.body.fiscal.subtotal).toBe(target.discountedTotal);
    expect(res.body.fiscal.tva).toBe(round3(target.discountedTotal * 0.19));
    // Booking is stamped with the package for provenance.
    const row = await prisma.booking.findUnique({ where: { id: res.body.id } });
    expect(row?.packageId).toBe(target.id);

    await request(app).delete(`/api/v1/admin/packages/${target.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('rejects booking an inactive package', async () => {
    const created = await request(app)
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(await sampleInput());
    expect(created.status).toBe(201);
    const id = created.body.id;

    await request(app)
      .patch(`/api/v1/admin/packages/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    // Hidden from the public listing.
    const list = await request(app).get('/api/v1/packages');
    expect(list.body.data.some((p: { id: string }) => p.id === id)).toBe(false);

    // And cannot be booked.
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventDate: '2027-01-15', eventType: 'WEDDING', packageId: id });
    expect(res.status).toBe(404);

    await request(app).delete(`/api/v1/admin/packages/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('supports admin create → update → delete', async () => {
    const created = await request(app)
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(await sampleInput());
    expect(created.status).toBe(201);
    expect(created.body.discountRate).toBe(0.2);
    const id = created.body.id;

    const updated = await request(app)
      .patch(`/api/v1/admin/packages/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountRate: 0.25 });
    expect(updated.body.discountRate).toBe(0.25);
    expect(updated.body.discountedTotal).toBe(round3(updated.body.originalTotal * 0.75));

    const del = await request(app)
      .delete(`/api/v1/admin/packages/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.body.deleted).toBe(true);
  });

  it('forbids non-admins from managing packages', async () => {
    const res = await request(app)
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(await sampleInput());
    expect(res.status).toBe(403);
  });
});

/** Build a valid package input from two seeded platform offerings. */
async function sampleInput() {
  const offerings = await prisma.serviceOffering.findMany({
    where: { vendor: { isPlatformOwned: true }, category: { in: ['CAKE', 'FLOWERS'] } },
    distinct: ['category'],
    take: 2,
  });
  return {
    name: { ar: 'باقة اختبار', fr: 'Pack test', en: 'Test pack' },
    description: { ar: 'وصف', fr: 'desc', en: 'desc' },
    discountRate: 0.2,
    offeringIds: offerings.map((o) => o.id),
  };
}
