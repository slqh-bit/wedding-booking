/**
 * Admin analytics endpoint — KPIs, revenue trend, status mix, top offerings,
 * ratings distribution. Requires Postgres running + seeded.
 */
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('admin analytics', () => {
  it('requires an admin', async () => {
    const customerToken = (
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'client@hafalati.tn', password: 'Customer1234' })
    ).body.accessToken;
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('returns a coherent analytics payload', async () => {
    const adminToken = (
      await request(app).post('/api/v1/auth/login').send({ email: 'admin@hafalati.tn', password: 'Admin1234' })
    ).body.accessToken;
    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const a = res.body;
    // KPIs present and non-negative.
    expect(a.kpis.confirmedRevenue).toBeGreaterThanOrEqual(0);
    expect(a.kpis.activeOfferings).toBeGreaterThan(0);
    expect(a.kpis.avgRating).toBeGreaterThanOrEqual(0);
    expect(a.kpis.avgRating).toBeLessThanOrEqual(5);

    // 6 month buckets, oldest → newest, last one is the current month.
    expect(a.revenueByMonth).toHaveLength(6);
    const now = new Date();
    const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(a.revenueByMonth[5].month).toBe(thisMonth);

    // Ratings distribution covers exactly 1..5.
    expect(a.ratingsDistribution.map((r: { rating: number }) => r.rating)).toEqual([1, 2, 3, 4, 5]);

    // Top offerings sorted by revenue desc.
    for (let i = 1; i < a.topOfferings.length; i++) {
      expect(a.topOfferings[i - 1].revenue).toBeGreaterThanOrEqual(a.topOfferings[i].revenue);
    }
  });
});
