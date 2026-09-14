/**
 * Multi-channel notification fan-out (email + SMS + WhatsApp + Telegram via the
 * console transports — no external creds). Verifies one Notification row per
 * enabled channel and per-channel dedup on retried settlement.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

// Enable all channels for this run (read at call time by getActiveChannels).
process.env.NOTIFY_CHANNELS = 'email,sms,whatsapp,telegram';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Multi Channel',
  email: `mc_${unique}@hafalati.tn`,
  phone: `+2165${String(unique).slice(-7)}`,
  password: 'Test12345',
};

let token = '';
let bookingId = '';

beforeAll(async () => {
  const reg = await request(app).post('/api/v1/auth/register').send(customer);
  token = reg.body.accessToken;
  // Link a Telegram chat id so the TELEGRAM channel has a recipient.
  await prisma.user.update({
    where: { email: customer.email },
    data: { telegramChatId: '123456789' },
  });
});

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
  delete process.env.NOTIFY_CHANNELS;
  await prisma.$disconnect();
});

describe('multi-channel fan-out', () => {
  it('creates one SENT notification per channel on confirm, deduped on retry', async () => {
    const halls = await request(app).get('/api/v1/offerings?category=HALL');
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 250);
    const bk = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventDate: eventDate.toISOString().slice(0, 10),
        eventType: 'WEDDING',
        offeringIds: [halls.body.data[5].id],
      });
    bookingId = bk.body.id;

    await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`);

    const received = await prisma.notification.findMany({
      where: { bookingId, type: 'BOOKING_RECEIVED' },
    });
    const channels = received.map((n) => n.channel).sort();
    expect(channels).toEqual(['EMAIL', 'SMS', 'TELEGRAM', 'WHATSAPP']);
    expect(received.every((n) => n.status === 'SENT')).toBe(true);

    // Email carries the long body; messaging channels carry the short one.
    const email = received.find((n) => n.channel === 'EMAIL')!;
    const sms = received.find((n) => n.channel === 'SMS')!;
    expect(email.body.length).toBeGreaterThan(sms.body.length);
    expect(sms.to).toBe(customer.phone);
    expect(received.find((n) => n.channel === 'TELEGRAM')!.to).toBe('123456789');
  });

  it('pays online → PAYMENT_CONFIRMED fans out, and repeated settle stays deduped', async () => {
    const pay = await request(app)
      .post(`/api/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    const ref = `mock_${pay.body.paymentId}`;
    await request(app).post(`/api/v1/payments/mock/${ref}/complete`).send({ status: 'CONFIRMED' });
    await request(app).post(`/api/v1/payments/mock/${ref}/complete`).send({ status: 'CONFIRMED' });

    const confirmed = await prisma.notification.findMany({
      where: { bookingId, type: 'PAYMENT_CONFIRMED' },
    });
    expect(confirmed).toHaveLength(4); // one per channel, no duplicates
  });
});
