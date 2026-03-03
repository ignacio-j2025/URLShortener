/**
 * Seed script: populates the database with 3 deterministic links and
 * 90 days of synthetic click data (varying daily counts).
 *
 * Usage: npm run seed   (from backend/ directory)
 *
 * Safe to re-run: existing seed slugs are skipped via INSERT OR IGNORE.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';
import { openDatabase } from './database.js';

const SEED_LINKS = [
  { slug: 'gh-home',  target_url: 'https://github.com' },
  { slug: 'hn-front', target_url: 'https://news.ycombinator.com' },
  { slug: 'mdn-js',   target_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
];

// Deterministic daily distribution: [0..6] maps to weight for each day-of-week
const DAY_WEIGHTS = [2, 5, 6, 6, 5, 3, 1]; // Sun-Sat: weekdays get more traffic

mkdirSync(dirname(config.dbPath), { recursive: true });
const db = openDatabase(config.dbPath);

const insertLink = db.prepare(
  'INSERT OR IGNORE INTO links (slug, target_url) VALUES (?, ?)'
);
const selectLink = db.prepare<[string], { id: number }>(
  'SELECT id FROM links WHERE slug = ?'
);
const insertClick = db.prepare(
  'INSERT INTO clicks (link_id, clicked_at, user_agent) VALUES (?, ?, ?)'
);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'curl/8.4.0',
];

const seedAll = db.transaction(() => {
  for (const link of SEED_LINKS) {
    const result = insertLink.run(link.slug, link.target_url);
    if (result.changes === 0) {
      console.log(`  [skip] ${link.slug} already exists`);
      continue;
    }
    const { id } = selectLink.get(link.slug)!;

    // Generate clicks for the past 90 days
    const today = new Date();
    let totalClicks = 0;

    for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const dayOfWeek = date.getDay();
      const clickCount = Math.floor(
        DAY_WEIGHTS[dayOfWeek] * (2 + Math.random() * 3)
      );

      // Spread clicks throughout the day
      for (let c = 0; c < clickCount; c++) {
        const clickTime = new Date(date);
        clickTime.setHours(Math.floor(Math.random() * 24));
        clickTime.setMinutes(Math.floor(Math.random() * 60));
        clickTime.setSeconds(Math.floor(Math.random() * 60));
        const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        insertClick.run(id, clickTime.toISOString().replace('T', 'T').slice(0, 19) + 'Z', ua);
        totalClicks++;
      }
    }
    console.log(`  [seed] ${link.slug} → ${link.target_url} (${totalClicks} clicks)`);
  }
});

console.log('Seeding database...');
seedAll();
console.log('Done.');
db.close();
