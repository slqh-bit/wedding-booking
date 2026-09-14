/**
 * Phase 2 — online payment gateway integration tests (mock provider).
 * Requires Postgres running + seeded.
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';
import { mockGateway, signMockPayload } from '../payments/mock.gateway.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Pay Tester',
  email: `pay_${unique}@hafalati.tn`,
  phone: `+2168${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let bookingId = '';
let paymentId = '';
let providerRef = '';

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: customer.email } });
  if (user) {
    const bookings = await prisma.booking.findMany({ where: { userId: user.id } });
    for (const b of bookings) {
      await prisma.availability.updateMany({
        where: { offering: { bookingItems: { some: { bookingId: b.id } } }, date: b.eventDate },
        data: { status: 'AVAILABLE' },
      });
    }
    await prisma.booking.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

describe('mock gateway unit', () => {
  it('inits a payment and reports PENDING, then rejects a bad webhook signature', async () => {
    const init = await mockGateway.initPayment({
      bookingId: 'b',
      paymentId: 'p1',
      amount: 100,
      reference: 'HF-TEST',
      description: 'test',
      customer: { fullName: 'A B', email: 'a@b.tn', phone: '+21600000000' },
      returnUrl: 'http://x/return',
      webhookUrl: 'http://x/webhook',
    });
    expect(init.providerRef).toBe('mock_p1');
    expect(init.checkoutUrl).toContain('/payment/mock/mock_p1');

    const v = await mockGateway.verify('mock_p1');
    expect(v.status).toBe('PENDING');

    await expect(
      mockGateway.parseWebhook({
        headers: { 'x-mock-signature': 'wrong' },
        query: {},
        body: { providerRef: 'mock_p1', status: 'CONFIRMED' },
      }),
    ).rejects.toThrow();

    const ok = await mockGateway.parseWebhook({
      headers: { 'x-mock-signature': signMockPayload('mock_p1:CONFIRMED') },
      query: {},
      body: { providerRef: 'mock_p1', status: 'CONFIRMED' },
    });
    expect(ok.status).toBe('CONFIRMED');
  });
});

describe('online payment lifecycle', () => {
  it('sets up a confirmed (PENDING) booking', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(customer);
    token = reg.body.accessToken;

    const halls = await request(app).get('/api/v1/offerings?category=HALL');
    const hallId = halls.body.data[0].id;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 75);

    const bk = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventDate: eventDate.toISOString().slice(0, 10),
        eventType: 'WEDDING',
        offeringIds: [hallId],
      });
    bookingId = bk.body.id;
    await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`);
  });

  it('inits a gateway payment and returns a checkout url', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toContain('/payment/mock/');
    paymentId = res.body.paymentId;
    providerRef = `mock_${paymentId}`;

    const status = await request(app)
      .get(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.status).toBe('PENDING');
  });

  it('rejects a webhook with a bad signature (400, no state change)', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/mock')
      .set('x-mock-signature', 'deadbeef')
      .send({ providerRef, status: 'CONFIRMED' });
    expect(res.status).toBe(400);

    const status = await request(app)
      .get(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.status).toBe('PENDING');
  });

  it('settles on a valid gateway callback → CONFIRMED + invoice, idempotently', async () => {
    const done = await request(app)
      .post(`/api/v1/payments/mock/${providerRef}/complete`)
      .send({ status: 'CONFIRMED' });
    expect(done.body.outcome).toBe('settled');

    const status = await request(app)
      .get(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.status).toBe('CONFIRMED');
    expect(status.body.bookingStatus).toBe('CONFIRMED');

    // A repeated callback must not create a second invoice.
    await request(app).post(`/api/v1/payments/mock/${providerRef}/complete`).send({ status: 'CONFIRMED' });
    const invoices = await prisma.invoice.count({ where: { bookingId } });
    expect(invoices).toBe(1);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.depositStatus).toBe('PAID');
  });
});
