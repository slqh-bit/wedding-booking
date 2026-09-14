/**
 * Integration test for the full reservation lifecycle against the real DB.
 * Requires Postgres running and seeded (`pnpm db:up && pnpm db:seed`).
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Test User',
  email: `test_${unique}@hafalati.tn`,
  phone: `+2169${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let customerToken = '';
let adminToken = '';
let bookingId = '';

afterAll(async () => {
  // Clean up the test customer + their bookings.
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

describe('reservation lifecycle', () => {
  it('exposes health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('lists 11 categories', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(11);
  });

  it('registers and logs in a customer', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(customer);
    expect(reg.status).toBe(201);
    expect(reg.body.accessToken).toBeTruthy();
    customerToken = reg.body.accessToken;
  });

  it('creates a booking with server-computed fiscal totals', async () => {
    const halls = await request(app).get('/api/v1/offerings?category=HALL');
    const cakes = await request(app).get('/api/v1/offerings?category=CAKE');
    const hallId = halls.body.data[0].id;
    const cakeId = cakes.body.data[0].id;
    const subtotal = halls.body.data[0].basePrice + cakes.body.data[0].basePrice;

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 45);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        eventDate: eventDate.toISOString().slice(0, 10),
        eventType: 'WEDDING',
        offeringIds: [hallId, cakeId],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.fiscal.subtotal).toBe(subtotal);
    // TVA is 19% of subtotal (millime rounding).
    expect(res.body.fiscal.tva).toBeCloseTo(Math.round(subtotal * 0.19 * 1000) / 1000, 3);
    expect(res.body.fiscal.total).toBeGreaterThan(subtotal);
    bookingId = res.body.id;
  });

  it('confirms the booking and creates a pending deposit payment', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].status).toBe('PENDING');
  });

  it('lets an admin confirm the payment → booking CONFIRMED + invoice', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hafalati.tn', password: 'Admin1234' });
    adminToken = login.body.accessToken;
    expect(adminToken).toBeTruthy();

    const pending = await request(app)
      .get('/api/v1/admin/bookings?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);
    const mine = pending.body.data.find((b: { id: string }) => b.id === bookingId);
    const paymentId = mine.payments[0].id;

    const res = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.depositStatus).toBe('PAID');

    const invoice = await prisma.invoice.findUnique({ where: { bookingId } });
    expect(invoice).toBeTruthy();
  });

  it('blocks customers from admin routes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});
