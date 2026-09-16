/**
 * Phase 3 Slice 1 — vendor accounts + moderation + catalog gating.
 * Requires Postgres running + seeded.
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const unique = Date.now();
const vendor = {
  fullName: 'Vendor One',
  email: `v1_${unique}@hafalati.tn`,
  phone: `+2165${String(unique).slice(-7)}`,
  password: 'Vendor1234',
  vendorName: 'Test Studio',
  city: 'Kasserine',
};

let vendorToken = '';
let adminToken = '';
let customerToken = '';
let vendorId = '';
let offeringId = '';

afterAll(async () => {
  const u = await prisma.user.findUnique({ where: { email: vendor.email } });
  if (u) {
    const v = await prisma.vendor.findUnique({ where: { userId: u.id } });
    if (v) await prisma.serviceOffering.deleteMany({ where: { vendorId: v.id } });
    await prisma.vendor.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
  await prisma.$disconnect();
});

async function musicHasOffering(id: string): Promise<boolean> {
  const res = await request(app).get('/api/v1/offerings?category=MUSIC');
  return res.body.data.some((o: { id: string }) => o.id === id);
}

describe('vendor onboarding + moderation', () => {
  it('self-registers as PENDING', async () => {
    const res = await request(app).post('/api/v1/vendors/register').send(vendor);
    expect(res.status).toBe(201);
    vendorToken = res.body.accessToken;
    expect(res.body.user.role).toBe('VENDOR');

    const me = await request(app).get('/api/v1/vendor/me').set('Authorization', `Bearer ${vendorToken}`);
    expect(me.body.status).toBe('PENDING');
    vendorId = me.body.id;

    adminToken = (
      await request(app).post('/api/v1/auth/login').send({ email: 'admin@hafalati.tn', password: 'Admin1234' })
    ).body.accessToken;
    customerToken = (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'client@hafalati.tn', password: 'Customer1234' })
    ).body.accessToken;
  });

  it('a new offering is PENDING and hidden from the public catalog', async () => {
    const res = await request(app)
      .post('/api/v1/vendor/offerings')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        category: 'MUSIC',
        name: { ar: 'دي جي', fr: 'DJ', en: 'DJ' },
        description: { ar: 'د', fr: 'd', en: 'd' },
        basePrice: 800,
      });
    expect(res.status).toBe(201);
    expect(res.body.moderationStatus).toBe('PENDING');
    offeringId = res.body.id;
    expect(await musicHasOffering(offeringId)).toBe(false);
  });

  it('appears only after both vendor and offering are approved', async () => {
    await request(app)
      .patch(`/api/v1/admin/vendors/${vendorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    // Still hidden — offering itself not approved yet.
    expect(await musicHasOffering(offeringId)).toBe(false);

    await request(app)
      .patch(`/api/v1/admin/offerings/${offeringId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(await musicHasOffering(offeringId)).toBe(true);
  });

  it('disappears again when the vendor is suspended', async () => {
    await request(app)
      .patch(`/api/v1/admin/vendors/${vendorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    expect(await musicHasOffering(offeringId)).toBe(false);
  });

  it('enforces ownership + role', async () => {
    // Customer can't reach the vendor dashboard.
    const forbidden = await request(app)
      .get('/api/v1/vendor/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbidden.status).toBe(403);

    // Vendor can't edit an offering that isn't theirs (a seeded platform one).
    const platform = await prisma.serviceOffering.findFirst({
      where: { vendor: { isPlatformOwned: true } },
    });
    const cross = await request(app)
      .patch(`/api/v1/vendor/offerings/${platform!.id}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ basePrice: 1 });
    expect(cross.status).toBe(404);
  });

  it('admin-created vendors are APPROVED immediately', async () => {
    const res = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vendorName: `Admin Made ${unique}`, city: 'Tunis' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('APPROVED');
    await prisma.vendor.delete({ where: { id: res.body.id } });
  });
});
