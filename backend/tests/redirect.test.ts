import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestContext, insertLink, TestContext } from './setup.js';

describe('Redirect endpoint', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('redirects to the target URL with 302', async () => {
    insertLink(ctx.db, 'gh-home', 'https://github.com');

    const res = await request(ctx.app)
      .get('/gh-home')
      .redirects(0); // don't follow redirects

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://github.com');
  });

  it('returns 404 JSON for an unknown slug', async () => {
    const res = await request(ctx.app).get('/unknown-slug');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('records a click event after redirect', async () => {
    const id = insertLink(ctx.db, 'click-me', 'https://example.com');

    // Allow setImmediate to flush before checking
    await request(ctx.app).get('/click-me').redirects(0);
    // Give the event loop a tick to run the setImmediate click insert
    await new Promise((r) => setImmediate(r));

    const row = ctx.db
      .prepare<[number], { count: number }>(
        'SELECT COUNT(*) AS count FROM clicks WHERE link_id = ?'
      )
      .get(id)!;

    expect(row.count).toBe(1);
  });

  it('records multiple click events independently', async () => {
    const id = insertLink(ctx.db, 'multi-click', 'https://example.com');

    for (let i = 0; i < 3; i++) {
      await request(ctx.app).get('/multi-click').redirects(0);
      await new Promise((r) => setImmediate(r));
    }

    const row = ctx.db
      .prepare<[number], { count: number }>(
        'SELECT COUNT(*) AS count FROM clicks WHERE link_id = ?'
      )
      .get(id)!;

    expect(row.count).toBe(3);
  });

  it('captures the user-agent header in the click record', async () => {
    const id = insertLink(ctx.db, 'ua-test', 'https://example.com');

    await request(ctx.app)
      .get('/ua-test')
      .set('User-Agent', 'test-browser/1.0')
      .redirects(0);
    await new Promise((r) => setImmediate(r));

    const row = ctx.db
      .prepare<[number], { user_agent: string | null }>(
        'SELECT user_agent FROM clicks WHERE link_id = ? LIMIT 1'
      )
      .get(id)!;

    expect(row.user_agent).toBe('test-browser/1.0');
  });

  it('does not interfere with /api routes', async () => {
    // Ensure the redirect handler does not swallow API routes
    const res = await request(ctx.app).get('/api/v1/links');
    expect(res.status).toBe(200);
  });

  it('matches a slug containing hyphens and digits', async () => {
    insertLink(ctx.db, 'my-link-123', 'https://example.com');

    const res = await request(ctx.app)
      .get('/my-link-123')
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('preserves query string and fragment exactly in the Location header', async () => {
    const target = 'https://example.com/path?q=1&lang=en#section';
    insertLink(ctx.db, 'complex-url', target);

    const res = await request(ctx.app)
      .get('/complex-url')
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(target);
  });

  it('matches a slug at the 50-character maximum length', async () => {
    const slug = 'a'.repeat(50);
    insertLink(ctx.db, slug, 'https://example.com');

    const res = await request(ctx.app)
      .get(`/${slug}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });
});
