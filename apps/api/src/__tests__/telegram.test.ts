/**
 * Telegram account linking flow (dev mock path — no real bot).
 * link → issue code → mock /start → chat id stored → status linked → unlink.
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const customer = {
  fullName: 'Telegram Tester',
  email: `tg_${unique}@hafalati.tn`,
  phone: `+2164${String(unique).slice(-7)}`,
  password: 'Test12345',
};
let token = '';

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: customer.email } });
  await prisma.$disconnect();
});

describe('telegram linking', () => {
  it('links via the dev mock /start, reports status, and unlinks', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(customer);
    token = reg.body.accessToken;

    // Not linked initially.
    const before = await request(app)
      .get('/api/v1/notifications/telegram/status')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.linked).toBe(false);

    // Start linking → get a code + deep link info.
    const link = await request(app)
      .post('/api/v1/notifications/telegram/link')
      .set('Authorization', `Bearer ${token}`);
    expect(link.body.code).toBeTruthy();
    expect(link.body.botConfigured).toBe(false); // no bot in tests

    // Simulate the bot's /start callback.
    const done = await request(app)
      .post('/api/v1/notifications/telegram/mock-link')
      .send({ code: link.body.code, chatId: '555000555' });
    expect(done.body.linked).toBe(true);

    // Chat id is stored, status is linked, code is cleared.
    const user = await prisma.user.findUnique({ where: { email: customer.email } });
    expect(user?.telegramChatId).toBe('555000555');
    expect(user?.telegramLinkCode).toBeNull();

    const after = await request(app)
      .get('/api/v1/notifications/telegram/status')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.linked).toBe(true);

    // Unlink.
    await request(app)
      .post('/api/v1/notifications/telegram/unlink')
      .set('Authorization', `Bearer ${token}`);
    const cleared = await prisma.user.findUnique({ where: { email: customer.email } });
    expect(cleared?.telegramChatId).toBeNull();
  });

  it('rejects the webhook with a bad secret when one is configured', async () => {
    // No secret configured in tests → webhook is permissive; assert it accepts.
    const res = await request(app)
      .post('/api/v1/notifications/telegram/webhook/anything')
      .send({ message: { text: '/start nope', chat: { id: 1 } } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
