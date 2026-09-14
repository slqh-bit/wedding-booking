/** Invoice PDF export: not-ready before settlement, real PDF after, authz. */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Invoice Tester',
  email: `inv_${unique}@hafalati.tn`,
  phone: `+2163${String(unique).slice(-7)}`,
  password: 'Test12345',
};
const other = {
  fullName: 'Other User',
  email: `oth_${unique}@hafalati.tn`,
  phone: `+2162${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let otherToken = '';
let bookingId = '';

afterAll(async () => {
  for (const email of [customer.email, other.email]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
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

const pdfParser = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('invoice PDF', () => {
  it('creates a confirmed booking (invoice issued)', async () => {
    token = (await request(app).post('/api/v1/auth/register').send(customer)).body.accessToken;
    otherToken = (await request(app).post('/api/v1/auth/register').send(other)).body.accessToken;

    const halls = await request(app).get('/api/v1/offerings?category=HALL');
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 300);
    bookingId = (
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventDate: eventDate.toISOString().slice(0, 10),
          eventType: 'WEDDING',
          offeringIds: [halls.body.data[0].id],
        })
    ).body.id;
    await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`);
  });

  it('returns 409 before the deposit is confirmed', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${bookingId}/invoice`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('streams a PDF once confirmed, and blocks a non-owner', async () => {
    const pay = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/v1/payments/mock/mock_${pay.body.paymentId}/complete`)
      .send({ status: 'CONFIRMED' });

    const res = await request(app)
      .get(`/api/v1/bookings/${bookingId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(pdfParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');

    const forbidden = await request(app)
      .get(`/api/v1/bookings/${bookingId}/invoice`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(404);
  });
});
