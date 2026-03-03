import { Request, Response, NextFunction } from 'express';
import { Database } from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { LinkRow } from '../types/index.js';

export function createRedirectController(db: Database) {
  const selectBySlug = db.prepare<[string], Pick<LinkRow, 'id' | 'target_url'>>(
    'SELECT id, target_url FROM links WHERE slug = ?'
  );
  const insertClick = db.prepare<[number, string | undefined]>(
    'INSERT INTO clicks (link_id, user_agent) VALUES (?, ?)'
  );

  return function redirect(req: Request, res: Response, next: NextFunction): void {
    try {
      const row = selectBySlug.get(String(req.params.slug));
      if (!row) {
        // Return JSON error for API consumers hitting a missing slug
        next(new AppError(404, 'NOT_FOUND', `No link found for slug: ${req.params.slug}`));
        return;
      }

      // Send the redirect immediately; record the click after the response is sent.
      // This keeps p99 redirect latency independent of write throughput.
      res.redirect(302, row.target_url);

      setImmediate(() => {
        try {
          insertClick.run(row.id, req.headers['user-agent']);
        } catch {
          // Click recording failure must not affect the user's redirect.
          // Log and swallow so errors don't propagate.
          console.error('[click-record] failed to insert click for link_id', row.id);
        }
      });
    } catch (err) {
      next(err);
    }
  };
}
