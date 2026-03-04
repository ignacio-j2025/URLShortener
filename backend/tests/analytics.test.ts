import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestContext, insertLink, insertClicks, TestContext } from './setup.js';

describe('Analytics endpoint', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('returns total clicks for a link', async () => {
    const id = insertLink(ctx.db, 'analytics-link', 'https://example.com');
    insertClicks(ctx.db, id, 7, '2026-01-10');

    const res = await request(ctx.app).get('/api/v1/links/analytics-link/analytics');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalClicks).toBe(7);
  });

  it('returns zero clicks for a link with no clicks', async () => {
    insertLink(ctx.db, 'empty-link', 'https://example.com');

    const res = await request(ctx.app).get('/api/v1/links/empty-link/analytics');

    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(0);
    expect(res.body.data.clicksByDay).toEqual([]);
  });

  it('groups clicks correctly by day', async () => {
    const id = insertLink(ctx.db, 'daily-link', 'https://example.com');
    insertClicks(ctx.db, id, 3, '2026-01-10');
    insertClicks(ctx.db, id, 5, '2026-01-11');
    insertClicks(ctx.db, id, 2, '2026-01-12');

    const res = await request(ctx.app)
      .get('/api/v1/links/daily-link/analytics')
      .query({ from: '2026-01-10', to: '2026-01-12' });

    expect(res.status).toBe(200);
    const days = res.body.data.clicksByDay;
    expect(days).toHaveLength(3);
    expect(days).toContainEqual({ date: '2026-01-10', clicks: 3 });
    expect(days).toContainEqual({ date: '2026-01-11', clicks: 5 });
    expect(days).toContainEqual({ date: '2026-01-12', clicks: 2 });
  });

  it('filters clicks by date range', async () => {
    const id = insertLink(ctx.db, 'range-link', 'https://example.com');
    insertClicks(ctx.db, id, 4, '2026-01-05'); // before range
    insertClicks(ctx.db, id, 6, '2026-01-10'); // in range
    insertClicks(ctx.db, id, 3, '2026-01-20'); // after range

    const res = await request(ctx.app)
      .get('/api/v1/links/range-link/analytics')
      .query({ from: '2026-01-10', to: '2026-01-15' });

    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(13); // total is all-time regardless of range
    const days = res.body.data.clicksByDay;
    expect(days).toHaveLength(1);
    expect(days[0]).toEqual({ date: '2026-01-10', clicks: 6 });
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(ctx.app).get('/api/v1/links/no-such/analytics');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when from > to', async () => {
    insertLink(ctx.db, 'bad-range', 'https://example.com');
    const res = await request(ctx.app)
      .get('/api/v1/links/bad-range/analytics')
      .query({ from: '2026-03-01', to: '2026-01-01' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns link metadata (slug, targetUrl, shortUrl, createdAt) in the response', async () => {
    insertLink(ctx.db, 'meta-link', 'https://meta.com');
    const res = await request(ctx.app).get('/api/v1/links/meta-link/analytics');

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('meta-link');
    expect(res.body.data.targetUrl).toBe('https://meta.com');
    expect(res.body.data.shortUrl).toContain('meta-link');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns correct clicks when from and to are the same date (single-day range)', async () => {
    const id = insertLink(ctx.db, 'single-day', 'https://example.com');
    insertClicks(ctx.db, id, 5, '2026-02-20');

    const res = await request(ctx.app)
      .get('/api/v1/links/single-day/analytics')
      .query({ from: '2026-02-20', to: '2026-02-20' });

    expect(res.status).toBe(200);
    expect(res.body.data.clicksByDay).toHaveLength(1);
    expect(res.body.data.clicksByDay[0]).toEqual({ date: '2026-02-20', clicks: 5 });
    expect(res.body.data.totalClicks).toBe(5);
  });

  it('returns empty clicksByDay but non-zero totalClicks when no clicks fall in the date range', async () => {
    const id = insertLink(ctx.db, 'outside-range', 'https://example.com');
    insertClicks(ctx.db, id, 4, '2026-01-01');
    insertClicks(ctx.db, id, 3, '2026-03-01');

    const res = await request(ctx.app)
      .get('/api/v1/links/outside-range/analytics')
      .query({ from: '2026-02-01', to: '2026-02-28' });

    expect(res.status).toBe(200);
    expect(res.body.data.clicksByDay).toEqual([]);
    expect(res.body.data.totalClicks).toBe(7);
  });

  it('correctly aggregates a large number of clicks', async () => {
    const id = insertLink(ctx.db, 'high-volume', 'https://example.com');
    const stmt = ctx.db.prepare(
      "INSERT INTO clicks (link_id, clicked_at, user_agent) VALUES (?, '2026-02-15T00:00:00Z', 'bot')"
    );
    ctx.db.transaction(() => {
      for (let i = 0; i < 1000; i++) stmt.run(id);
    })();

    const res = await request(ctx.app)
      .get('/api/v1/links/high-volume/analytics')
      .query({ from: '2026-02-15', to: '2026-02-15' });

    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(1000);
    expect(res.body.data.clicksByDay).toHaveLength(1);
    expect(res.body.data.clicksByDay[0]).toEqual({ date: '2026-02-15', clicks: 1000 });
  });
});
