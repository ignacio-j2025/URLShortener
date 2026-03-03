import { Router } from 'express';
import { Database } from 'better-sqlite3';
import { createAnalyticsController } from '../controllers/analytics.controller.js';

export function createAnalyticsRouter(db: Database): Router {
  const router = Router({ mergeParams: true });
  const controller = createAnalyticsController(db);

  router.get('/', controller.getAnalytics);

  return router;
}
