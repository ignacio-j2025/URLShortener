-- ============================================================
-- Migration 001: Initial schema
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- links: canonical slug -> target_url mapping
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  target_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Primary lookup key on every redirect - must be unique and indexed
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links (slug);

-- ------------------------------------------------------------
-- clicks: immutable event log; never update or delete rows
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id    INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  user_agent TEXT
);

-- Every analytics query filters by link_id
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks (link_id);

-- Covering index for daily aggregation: avoids full table scan on GROUP BY date(clicked_at)
CREATE INDEX IF NOT EXISTS idx_clicks_link_date ON clicks (link_id, date(clicked_at));

-- ------------------------------------------------------------
-- schema_migrations: tracks which migrations have been applied
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES ('001_initial');
