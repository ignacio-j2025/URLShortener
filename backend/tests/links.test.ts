import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestContext, insertLink, TestContext } from './setup.js';

describe('Links API', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe('POST /api/v1/links', () => {
    it('creates a link with auto-generated slug', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toMatch(/^[a-z0-9]{8}$/);
      expect(res.body.data.targetUrl).toBe('https://example.com');
      expect(res.body.data.shortUrl).toContain(res.body.data.slug);
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('creates a link with a custom slug', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'https://example.com', slug: 'my-link' });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('my-link');
    });

    it('returns 409 when slug is already taken', async () => {
      await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'https://example.com', slug: 'taken' });

      const res = await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'https://other.com', slug: 'taken' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SLUG_TAKEN');
    });

    it('returns 422 for invalid input', async () => {
      const invalidUrl = await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'not-a-url' });

      expect(invalidUrl.status).toBe(422);
      expect(invalidUrl.body.success).toBe(false);
      expect(invalidUrl.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidUrl.body.error.message).toHaveProperty('targetUrl');

      const missingUrl = await request(ctx.app).post('/api/v1/links').send({});
      expect(missingUrl.status).toBe(422);

      const shortSlug = await request(ctx.app)
        .post('/api/v1/links')
        .send({ targetUrl: 'https://example.com', slug: 'ab' });
      expect(shortSlug.status).toBe(422);
    });
  });

  describe('GET /api/v1/links', () => {
    it('returns an empty list when no links exist', async () => {
      const res = await request(ctx.app).get('/api/v1/links');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('returns all links with totalClicks and paginates', async () => {
      for (let i = 0; i < 5; i++) {
        insertLink(ctx.db, `link-${i}`, `https://example${i}.com`);
      }

      const all = await request(ctx.app).get('/api/v1/links');
      expect(all.status).toBe(200);
      expect(all.body.data.items).toHaveLength(5);
      expect(all.body.data.total).toBe(5);
      expect(all.body.data.items[0]).toHaveProperty('totalClicks', 0);

      const page2 = await request(ctx.app).get('/api/v1/links?page=2&limit=2');
      expect(page2.status).toBe(200);
      expect(page2.body.data.items).toHaveLength(2);
      expect(page2.body.data.page).toBe(2);
      expect(page2.body.data.total).toBe(5);
    });
  });

  describe('GET /api/v1/links/:slug', () => {
    it('returns the link by slug', async () => {
      insertLink(ctx.db, 'get-me', 'https://getme.com');
      const res = await request(ctx.app).get('/api/v1/links/get-me');
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('get-me');
    });

    it('returns 404 for unknown slug', async () => {
      const res = await request(ctx.app).get('/api/v1/links/ghost');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/links/:slug', () => {
    it('deletes a link', async () => {
      insertLink(ctx.db, 'del-me', 'https://del.com');

      const res = await request(ctx.app).delete('/api/v1/links/del-me');
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const check = await request(ctx.app).get('/api/v1/links/del-me');
      expect(check.status).toBe(404);
    });

    it('returns 404 when deleting a non-existent slug', async () => {
      const res = await request(ctx.app).delete('/api/v1/links/no-exist');
      expect(res.status).toBe(404);
    });
  });
});
