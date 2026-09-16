/**
 * Phase 3 Slice 2 — commission + payout ledger (reporting).
 * A confirmed booking that mixes a non-platform vendor's offering with a
 * platform offering must record one VendorEarning for the vendor only, with
 * gross/commission/net computed at the vendor's rate. Requires Postgres + seed.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Earnings Tester',
  email: `earn_${unique}@hafalati.tn`,
  phone: `+2169${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let adminToken = '';
let vendorToken = '';
let bookingId = '';
let paymentId = '';
let vendorId = '';
let vendorOfferingId = '';
let platformOfferingId = '';
let eventDay = '';
const rate = 0.1; // seeded vendor default commissionRate
const gross = 1400; // seeded vendor PHOTOGRAPHY price
const commission = 140;
const net = 1260;

beforeAll(async () => {
  // Resolve the seeded APPROVED vendor + its date-bound PHOTOGRAPHY offering.
  const vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@hafalati.tn' } });
  const vendor = await prisma.vendor.findUnique({ where: { userId: vendorUser!.id } });
  vendorId = vendor!.id;
  const photo = await prisma.serviceOffering.findFirst({
    where: { vendorId, category: 'PHOTOGRAPHY' },
  });
  vendorOfferingId = photo!.id;

  // A platform-owned, non-date-bound offering (produces no earning, no availability collision).
  const cake = await prisma.serviceOffering.findFirst({
    where: { category: 'CAKE', vendor: { isPlatformOwned: true } },
  });
  platformOfferingId = cake!.id;

  // Pick a still-AVAILABLE date for the vendor's date-bound offering (residue-proof).
  const free = await prisma.availability.findFirst({
    where: { offeringId: vendorOfferingId, status: 'AVAILABLE', date: { gte: new Date() } },
    orderBy: { date: 'desc' },
  });
  eventDay = free!.date.toISOString().slice(0, 10);
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: customer.email } });
  if (user) {
    const bookings = await prisma.booking.findMany({ where: { userId: user.id } });
    for (const b of bookings) {
      await prisma.vendorEarning.deleteMany({ where: { bookingId: b.id } });
      await prisma.availability.updateMany({
        where: { offering: { bookingItems: { some: { bookingId: b.id } } }, date: b.eventDate },
        data: { status: 'AVAILABLE' },
      });
    }
    await prisma.booking.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  // Restore any earnings we flipped to PAID back to PENDING so the ledger stays clean.
  await prisma.$disconnect();
});

describe('commission + payout ledger', () => {
  it('logs in the actors', async () => {
    token = (await request(app).post('/api/v1/auth/register').send(customer)).body.accessToken;
    adminToken = (
      await request(app).post('/api/v1/auth/login').send({ email: 'admin@hafalati.tn', password: 'Admin1234' })
    ).body.accessToken;
    vendorToken = (
      await request(app).post('/api/v1/auth/login').send({ email: 'vendor@hafalati.tn', password: 'Vendor1234' })
    ).body.accessToken;
    expect(adminToken).toBeTruthy();
    expect(vendorToken).toBeTruthy();
  });

  it('records exactly one earning (vendor only) on settle', async () => {
    const bk = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventDate: eventDay,
        eventType: 'WEDDING',
        offeringIds: [vendorOfferingId, platformOfferingId],
      });
    expect(bk.status).toBe(201);
    bookingId = bk.body.id;

    await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`);

    // Drive the shared settlePayment path through the mock gateway.
    const pay = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    paymentId = pay.body.paymentId;
    const done = await request(app)
      .post(`/api/v1/payments/mock/mock_${paymentId}/complete`)
      .send({ status: 'CONFIRMED' });
    expect(done.body.outcome).toBe('settled');

    const earnings = await prisma.vendorEarning.findMany({ where: { bookingId } });
    expect(earnings).toHaveLength(1); // platform CAKE item produced none
    const e = earnings[0]!;
    expect(e.vendorId).toBe(vendorId);
    expect(Number(e.grossAmount)).toBe(gross);
    expect(Number(e.commissionRate)).toBe(rate);
    expect(Number(e.commissionAmount)).toBe(commission);
    expect(Number(e.netAmount)).toBe(net);
    expect(e.status).toBe('PENDING');
  });

  it('is idempotent — a repeated settle does not duplicate earnings', async () => {
    await request(app).post(`/api/v1/payments/mock/mock_${paymentId}/complete`).send({ status: 'CONFIRMED' });
    const count = await prisma.vendorEarning.count({ where: { bookingId } });
    expect(count).toBe(1);
  });

  it('surfaces the pending net to the vendor', async () => {
    const res = await request(app).get('/api/v1/vendor/earnings').set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(200);
    const row = res.body.earnings.find((r: { bookingId: string }) => r.bookingId === bookingId);
    expect(row).toBeTruthy();
    expect(row.netAmount).toBe(net);
    expect(row.status).toBe('PENDING');
  });

  it('admin payouts summary includes the vendor pending net', async () => {
    const res = await request(app).get('/api/v1/admin/payouts').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const summary = res.body.data.find((s: { vendorId: string }) => s.vendorId === vendorId);
    expect(summary).toBeTruthy();
    expect(summary.pendingNet).toBeGreaterThanOrEqual(net);
  });

  it('settling a payout flips the booking earning to PAID', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/payouts/${vendorId}/settle`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const e = await prisma.vendorEarning.findUnique({
      where: { vendorId_bookingId: { vendorId, bookingId } },
    });
    expect(e?.status).toBe('PAID');
    expect(e?.paidAt).toBeTruthy();
  });
});
