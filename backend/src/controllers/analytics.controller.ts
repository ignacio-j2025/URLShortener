import { Request, Response, NextFunction } from 'express';
import { Database } from 'better-sqlite3';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';
import { LinkRow, DailyClickRow } from '../types/index.js';
import { config } from '../config.js';

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29); // last 30 days inclusive
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function createAnalyticsController(db: Database) {
  return {
    getAnalytics(req: Request, res: Response, next: NextFunction): void {
      try {
        const slug = String(req.params.slug);

        const link = db
          .prepare<[string], Pick<LinkRow, 'id' | 'slug' | 'target_url' | 'created_at'>>(
            'SELECT id, slug, target_url, created_at FROM links WHERE slug = ?'
          )
          .get(slug);

        if (!link) {
          throw new AppError(404, 'NOT_FOUND', `No link found for slug: ${slug}`);
        }

        const defaults = defaultDateRange();
        const from = String(req.query.from ?? defaults.from);
        const to = String(req.query.to ?? defaults.to);

        // Validate date range order
        if (from > to) {
          throw new AppError(422, 'VALIDATION_ERROR', "'from' must not be after 'to'");
        }

        const totalRow = db
          .prepare<[number], { total: number }>(
            'SELECT COUNT(*) AS total FROM clicks WHERE link_id = ?'
          )
          .get(link.id)!;

        // Uses the composite index (link_id, date(clicked_at)) for fast grouping
        const clicksByDay = db
          .prepare<[number, string, string], DailyClickRow>(
            `SELECT date(clicked_at) AS day, COUNT(*) AS clicks
             FROM   clicks
             WHERE  link_id = ?
               AND  date(clicked_at) BETWEEN ? AND ?
             GROUP  BY date(clicked_at)
             ORDER  BY day ASC`
          )
          .all(link.id, from, to);

        res.json(
          successResponse({
            slug: link.slug,
            targetUrl: link.target_url,
            shortUrl: `${config.baseUrl}/${link.slug}`,
            createdAt: link.created_at,
            totalClicks: totalRow.total,
            clicksByDay: clicksByDay.map((r) => ({ date: r.day, clicks: r.clicks })),
          })
        );
      } catch (err) {
        next(err);
      }
    },
  };
}
