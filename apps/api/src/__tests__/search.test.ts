/**
 * Phase 3 slice 4 — public catalog search & filtering.
 * Exercises category / price / rating filters, sort orders, text query, and
 * pagination against the seeded catalog. Requires Postgres running + seeded.
 */
import { describe, expect, it, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();
const search = (qs: string) => request(app).get(`/api/v1/search${qs}`);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('catalog search & filtering', () => {
  it('paginates with a stable total', async () => {
    const p1 = await search('?pageSize=10&page=1');
    expect(p1.status).toBe(200);
    expect(p1.body.total).toBeGreaterThan(10);
    expect(p1.body.data).toHaveLength(10);
    expect(p1.body.page).toBe(1);

    const p2 = await search('?pageSize=10&page=2');
    expect(p2.body.total).toBe(p1.body.total);
    // Different page → different first item.
    expect(p2.body.data[0].id).not.toBe(p1.body.data[0].id);
  });

  it('filters by category', async () => {
    const res = await search('?category=HALL&pageSize=48');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((o: { category: string }) => o.category === 'HALL')).toBe(true);
  });

  it('filters by price range', async () => {
    const res = await search('?minPrice=2000&maxPrice=3000&pageSize=48');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((o: { basePrice: number }) => o.basePrice >= 2000 && o.basePrice <= 3000),
    ).toBe(true);
  });

  it('sorts by price ascending and descending', async () => {
    const asc = (await search('?sort=price_asc&pageSize=48')).body.data.map(
      (o: { basePrice: number }) => o.basePrice,
    );
    const desc = (await search('?sort=price_desc&pageSize=48')).body.data.map(
      (o: { basePrice: number }) => o.basePrice,
    );
    expect([...asc]).toEqual([...asc].sort((a, b) => a - b));
    expect([...desc]).toEqual([...desc].sort((a, b) => b - a));
  });

  it('filters by minimum rating (only reviewed offerings survive)', async () => {
    const res = await search('?minRating=1&pageSize=48');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((o: { ratingCount: number }) => o.ratingCount > 0)).toBe(true);
    // rating_desc keeps the highest first.
    const sorted = (await search('?minRating=1&sort=rating_desc&pageSize=48')).body.data;
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].ratingAvg).toBeGreaterThanOrEqual(sorted[i].ratingAvg);
    }
  });

  it('matches a free-text query across locales', async () => {
    // English query hits the localized name/description.
    const res = await search('?q=cinematic&pageSize=48');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((o: { name: { en: string }; description: { en: string } }) =>
        `${o.name.en} ${o.description.en}`.toLowerCase().includes('cinematic'),
      ),
    ).toBe(true);
  });

  it('only returns publicly visible offerings (approved)', async () => {
    const res = await search('?category=DECOR&pageSize=48');
    // The seeded PENDING vendor's DECOR offering must not appear.
    expect(res.body.data.every((o: { moderationStatus: string }) => o.moderationStatus === 'APPROVED')).toBe(
      true,
    );
  });
});
