import { Router } from 'express';
import { Database } from 'better-sqlite3';
import { createLinksRouter } from './links.js';
import { createAnalyticsRouter } from './analytics.js';

export function createApiRouter(db: Database): Router {
  const router = Router();

  router.use('/links', createLinksRouter(db));
  // Analytics nested under /links/:slug/analytics
  router.use('/links/:slug/analytics', createAnalyticsRouter(db));

  return router;
}
