import { Router } from 'express';
import { Database } from 'better-sqlite3';
import { createLinksController } from '../controllers/links.controller.js';
import { validateBody } from '../middleware/validateBody.js';
import { createLinkSchema } from '../schemas/link.schema.js';

export function createLinksRouter(db: Database): Router {
  const router = Router();
  const controller = createLinksController(db);

  router.post('/', validateBody(createLinkSchema), controller.create);
  router.get('/', controller.list);
  router.get('/:slug', controller.getOne);
  router.delete('/:slug', controller.remove);

  return router;
}
