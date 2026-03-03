import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';
import { openDatabase } from './db/database.js';
import { createApp } from './app.js';

// Ensure the data directory exists
mkdirSync(dirname(config.dbPath), { recursive: true });

const db = openDatabase(config.dbPath);
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  console.log(`[api] short URLs resolve at ${config.baseUrl}/<slug>`);
});
