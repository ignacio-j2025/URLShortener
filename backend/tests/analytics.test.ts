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

  it('returns slug and targetUrl in the response', async () => {
    insertLink(ctx.db, 'meta-link', 'https://meta.com');
    const res = await request(ctx.app).get('/api/v1/links/meta-link/analytics');

    expect(res.body.data.slug).toBe('meta-link');
    expect(res.body.data.targetUrl).toBe('https://meta.com');
  });

  it('returns createdAt in the response', async () => {
    insertLink(ctx.db, 'created-link', 'https://example.com');
    const res = await request(ctx.app).get('/api/v1/links/created-link/analytics');

    expect(res.status).toBe(200);
    expect(res.body.data.createdAt).toBeDefined();
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns shortUrl in the response', async () => {
    insertLink(ctx.db, 'short-link', 'https://example.com');
    const res = await request(ctx.app).get('/api/v1/links/short-link/analytics');

    expect(res.status).toBe(200);
    expect(res.body.data.shortUrl).toBeDefined();
    expect(res.body.data.shortUrl).toContain('short-link');
  });
});
