import BetterSqlite3, { Database } from 'better-sqlite3';
import { Express } from 'express';
import { runMigrations } from '../src/db/database.js';
import { createApp } from '../src/app.js';

export interface TestContext {
  app: Express;
  db: Database;
}

export function createTestContext(): TestContext {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  const app = createApp(db);
  return { app, db };
}

/** Insert a link directly into the DB and return its id */
export function insertLink(
  db: Database,
  slug: string,
  targetUrl: string
): number {
  const result = db
    .prepare('INSERT INTO links (slug, target_url) VALUES (?, ?)')
    .run(slug, targetUrl);
  return result.lastInsertRowid as number;
}

/** Insert N click events for a given link_id, each on the provided date string */
export function insertClicks(
  db: Database,
  linkId: number,
  count: number,
  date = '2026-01-15'
): void {
  const stmt = db.prepare(
    "INSERT INTO clicks (link_id, clicked_at, user_agent) VALUES (?, ?, 'test-agent')"
  );
  const insertMany = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      stmt.run(linkId, `${date}T12:00:0${i % 10}Z`);
    }
  });
  insertMany();
}
