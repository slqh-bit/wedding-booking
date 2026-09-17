/**
 * Image upload endpoint — auth-gated, type/size validated, served back at
 * /uploads. Requires Postgres running + seeded (for the vendor login).
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
// A tiny valid 1x1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let vendorToken = '';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('image uploads', () => {
  it('rejects an unauthenticated upload', async () => {
    const res = await request(app).post('/api/v1/uploads').attach('file', PNG, 'x.png');
    expect(res.status).toBe(401);
  });

  it('accepts a PNG from a vendor and serves it back', async () => {
    vendorToken = (
      await request(app).post('/api/v1/auth/login').send({ email: 'vendor@hafalati.tn', password: 'Vendor1234' })
    ).body.accessToken;

    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${vendorToken}`)
      .attach('file', PNG, 'photo.png');
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/.+\.png$/);

    // The stored file is served back.
    const served = await request(app).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
  });

  it('rejects a non-image file type', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${vendorToken}`)
      .attach('file', Buffer.from('hello'), 'note.txt');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unsupported_type');
  });
});
