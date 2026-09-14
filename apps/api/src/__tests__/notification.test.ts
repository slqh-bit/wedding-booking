/**
 * Phase 2 — notifications: template rendering (trilingual) + integration
 * (confirm → BOOKING_RECEIVED, settle → PAYMENT_CONFIRMED, deduped).
 * Uses the console channel (NOTIFY_PROVIDER default), so no SMTP is needed.
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';
import { renderTemplate } from '../notifications/templates.js';

// This suite asserts on the single default channel; pin it so a parallel
// multi-channel suite can't leak NOTIFY_CHANNELS into this run.
process.env.NOTIFY_CHANNELS = 'email';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Notify Tester',
  email: `notify_${unique}@hafalati.tn`,
  phone: `+2167${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let adminToken = '';
let bookingId = '';

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
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.booking.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

describe('notification templates', () => {
  const ctx = {
    customerName: 'Sami',
    reference: 'HF-ABC123',
    eventType: 'WEDDING',
    eventDate: '2026-10-01',
    total: 1000,
    deposit: 300,
    invoiceNumber: 'INV-2026-0001',
  };

  it('renders BOOKING_RECEIVED in all three locales with the reference', () => {
    for (const locale of ['ar', 'fr', 'en'] as const) {
      const m = renderTemplate('BOOKING_RECEIVED', locale, ctx);
      expect(m.subject).toContain('HF-ABC123');
      expect(m.body).toContain('Sami');
    }
  });

  it('renders PAYMENT_CONFIRMED with the invoice number', () => {
    const m = renderTemplate('PAYMENT_CONFIRMED', 'ar', ctx);
    expect(m.body).toContain('INV-2026-0001');
    expect(m.subject).toContain('HF-ABC123');
  });
});

describe('notification lifecycle', () => {
  it('sends BOOKING_RECEIVED on confirm and PAYMENT_CONFIRMED on settle (deduped)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(customer);
    token = reg.body.accessToken;
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hafalati.tn', password: 'Admin1234' });
    adminToken = login.body.accessToken;

    const halls = await request(app).get('/api/v1/offerings?category=HALL');
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 200);
    const bk = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventDate: eventDate.toISOString().slice(0, 10),
        eventType: 'ENGAGEMENT',
        offeringIds: [halls.body.data[4].id],
      });
    bookingId = bk.body.id;

    await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`);
    const afterConfirm = await prisma.notification.findMany({ where: { bookingId } });
    expect(afterConfirm.map((n) => n.type)).toContain('BOOKING_RECEIVED');
    expect(afterConfirm.every((n) => n.status === 'SENT')).toBe(true);

    // Pay online (mock) → settle → PAYMENT_CONFIRMED
    const pay = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    const ref = `mock_${pay.body.paymentId}`;
    await request(app).post(`/api/v1/payments/mock/${ref}/complete`).send({ status: 'CONFIRMED' });
    // A repeated settlement must not create a second PAYMENT_CONFIRMED.
    await request(app).post(`/api/v1/payments/mock/${ref}/complete`).send({ status: 'CONFIRMED' });

    const all = await prisma.notification.findMany({ where: { bookingId } });
    const types = all.map((n) => n.type).sort();
    expect(types).toEqual(['BOOKING_RECEIVED', 'PAYMENT_CONFIRMED']);
    expect(all.filter((n) => n.type === 'PAYMENT_CONFIRMED')).toHaveLength(1);
  });

  it('exposes notifications to admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((n: { bookingRef: string }) => Boolean(n.bookingRef))).toBe(true);
  });
});
