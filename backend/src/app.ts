import express, { Express } from 'express';
import cors from 'cors';
import { Database } from 'better-sqlite3';
import { createApiRouter } from './routes/index.js';
import { createRedirectController } from './controllers/redirect.controller.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(db: Database): Express {
  const app = express();

  app.use(express.json());
  // Allow the Vite dev server (port 5173) and any production origin
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.CORS_ORIGIN ?? '',
      ].filter(Boolean),
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    })
  );

  // Versioned REST API
  app.use('/api/v1', createApiRouter(db));

  // Root-level redirect route — must come after /api/** to avoid conflicts
  const redirect = createRedirectController(db);
  app.get('/:slug', redirect);

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}
