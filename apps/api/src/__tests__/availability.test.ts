/**
 * Integration tests for the date-availability engine:
 *  - a date-limited category hides an offering already booked on the event date;
 *  - an unlimited category ignores the date entirely;
 *  - the admin date-limit toggle flips that behaviour per category;
 *  - the check-availability endpoint reports the reserved ids.
 * Requires Postgres running and seeded.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Avail Tester',
  email: `avail_${unique}@hafalati.tn`,
  phone: `+2168${String(unique).slice(-7)}`,
  password: 'Test12345',
};

// Far-future, distinct dates so nothing in the seed collides with them.
const bookedDate = isoInDays(400);
const freeDate = isoInDays(401);
const flowerDate = isoInDays(402);

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let token = '';
let adminToken = '';
let hallId = '';
let flowerId = '';

beforeAll(async () => {
  const reg = await request(app).post('/api/v1/auth/register').send(customer);
  token = reg.body.accessToken;
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@hafalati.tn', password: 'Admin1234' });
  adminToken = login.body.accessToken;

  hallId = (await request(app).get('/api/v1/offerings?category=HALL')).body.data[0].id;
  flowerId = (await request(app).get('/api/v1/offerings?category=FLOWERS')).body.data[0].id;

  // Book + confirm the hall on `bookedDate` to lock that whole day.
  const created = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ eventDate: bookedDate, eventType: 'WEDDING', offeringIds: [hallId] });
  await request(app)
    .post(`/api/v1/bookings/${created.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`);
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: customer.email } });
  if (user) {
    await prisma.availability.deleteMany({
      where: {
        offeringId: { in: [hallId, flowerId] },
        date: {
          in: [
            new Date(`${bookedDate}T00:00:00.000Z`),
            new Date(`${flowerDate}T00:00:00.000Z`),
          ],
        },
      },
    });
    await prisma.booking.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  // Ensure FLOWERS is back to its unlimited default.
  await prisma.categoryConfig.upsert({
    where: { category: 'FLOWERS' },
    update: { dateLimited: false },
    create: { category: 'FLOWERS', dateLimited: false },
  });
  await prisma.$disconnect();
});

describe('date-limited catalog filtering', () => {
  it('hides a booked hall on the booked date', async () => {
    const res = await request(app).get(`/api/v1/offerings?category=HALL&date=${bookedDate}`);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).not.toContain(hallId);
  });

  it('shows the hall on a free date', async () => {
    const res = await request(app).get(`/api/v1/offerings?category=HALL&date=${freeDate}`);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(hallId);
  });

  it('shows the hall when no date filter is applied', async () => {
    const res = await request(app).get('/api/v1/offerings?category=HALL');
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(hallId);
  });

  it('ignores the date for an unlimited category (FLOWERS)', async () => {
    // Even booking a flower on a date must not hide it, since FLOWERS is unlimited.
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventDate: bookedDate, eventType: 'WEDDING', offeringIds: [flowerId] });
    await request(app)
      .post(`/api/v1/bookings/${created.body.id}/confirm`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get(`/api/v1/offerings?category=FLOWERS&date=${bookedDate}`);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(flowerId);
  });
});

describe('check-availability endpoint', () => {
  it('reports the reserved hall on the booked date', async () => {
    const res = await request(app)
      .post('/api/v1/offerings/check-availability')
      .send({ date: bookedDate, offeringIds: [hallId] });
    expect(res.status).toBe(200);
    expect(res.body.unavailable).toContain(hallId);
  });

  it('reports nothing on a free date', async () => {
    const res = await request(app)
      .post('/api/v1/offerings/check-availability')
      .send({ date: freeDate, offeringIds: [hallId] });
    expect(res.body.unavailable).toEqual([]);
  });
});

describe('admin date-limit toggle', () => {
  it('lists all 11 categories with a dateLimited flag', async () => {
    const res = await request(app)
      .get('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(11);
    const hall = res.body.data.find((c: { category: string }) => c.category === 'HALL');
    expect(hall.dateLimited).toBe(true);
  });

  it('flips FLOWERS to date-limited → a flower booked afterwards is hidden on its date', async () => {
    const patch = await request(app)
      .patch('/api/v1/admin/categories/FLOWERS')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dateLimited: true });
    expect(patch.status).toBe(200);
    expect(patch.body.dateLimited).toBe(true);

    // Now that FLOWERS is date-limited, confirming a flower locks the day.
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventDate: flowerDate, eventType: 'WEDDING', offeringIds: [flowerId] });
    await request(app)
      .post(`/api/v1/bookings/${created.body.id}/confirm`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get(`/api/v1/offerings?category=FLOWERS&date=${flowerDate}`);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).not.toContain(flowerId);
  });

  it('reverting FLOWERS to unlimited shows the flower again', async () => {
    await request(app)
      .patch('/api/v1/admin/categories/FLOWERS')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dateLimited: false });

    const res = await request(app).get(`/api/v1/offerings?category=FLOWERS&date=${flowerDate}`);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(flowerId);
  });

  it('blocks non-admins from the category config', async () => {
    const res = await request(app)
      .get('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
