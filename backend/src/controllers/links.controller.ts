import { Request, Response, NextFunction } from 'express';
import { Database } from 'better-sqlite3';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSlug } from '../utils/slugGenerator.js';
import { CreateLinkInput } from '../schemas/link.schema.js';
import { LinkRow } from '../types/index.js';
import { config } from '../config.js';

function rowToLink(row: LinkRow, baseUrl: string) {
  return {
    id: row.id,
    slug: row.slug,
    targetUrl: row.target_url,
    shortUrl: `${baseUrl}/${row.slug}`,
    totalClicks: row.total_clicks ?? 0,
    createdAt: row.created_at,
  };
}

export function createLinksController(db: Database) {
  const insertLink = db.prepare<[string, string]>(
    'INSERT INTO links (slug, target_url) VALUES (?, ?)'
  );
  const selectBySlug = db.prepare<[string], LinkRow>(
    'SELECT id, slug, target_url, created_at FROM links WHERE slug = ?'
  );
  const selectAll = db.prepare<[number, number], LinkRow & { total_clicks: number }>(
    `SELECT l.id, l.slug, l.target_url, l.created_at,
            (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS total_clicks
     FROM links l
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  );
  const countAll = db.prepare<[], { count: number }>(
    'SELECT COUNT(*) AS count FROM links'
  );
  const deleteBySlug = db.prepare<[string]>('DELETE FROM links WHERE slug = ?');

  return {
    create(req: Request, res: Response, next: NextFunction): void {
      try {
        const { targetUrl, slug } = res.locals.validated as CreateLinkInput;
        const finalSlug = slug ?? generateSlug();
        insertLink.run(finalSlug, targetUrl);
        const row = selectBySlug.get(finalSlug)!;
        res.status(201).json(successResponse(rowToLink(row, config.baseUrl)));
      } catch (err) {
        next(err);
      }
    },

    list(req: Request, res: Response, next: NextFunction): void {
      try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const offset = (page - 1) * limit;
        const items = selectAll.all(limit, offset).map((r) => rowToLink(r, config.baseUrl));
        const { count: total } = countAll.get()!;
        res.json(successResponse({ items, total, page, limit }));
      } catch (err) {
        next(err);
      }
    },

    getOne(req: Request, res: Response, next: NextFunction): void {
      try {
        const slug = String(req.params.slug);
        const row = db
          .prepare<[string], LinkRow & { total_clicks: number }>(
            `SELECT l.id, l.slug, l.target_url, l.created_at,
                    (SELECT COUNT(*) FROM clicks WHERE link_id = l.id) AS total_clicks
             FROM links l WHERE l.slug = ?`
          )
          .get(slug);
        if (!row) {
          throw new AppError(404, 'NOT_FOUND', `No link found for slug: ${slug}`);
        }
        res.json(successResponse(rowToLink(row, config.baseUrl)));
      } catch (err) {
        next(err);
      }
    },

    remove(req: Request, res: Response, next: NextFunction): void {
      try {
        const slug = String(req.params.slug);
        const result = deleteBySlug.run(slug);
        if (result.changes === 0) {
          throw new AppError(404, 'NOT_FOUND', `No link found for slug: ${slug}`);
        }
        res.json(successResponse({ deleted: true }));
      } catch (err) {
        next(err);
      }
    },
  };
}
