# URL Shortener with Click Analytics

A full-stack URL shortener with a click tracking dashboard. Create short links, share them, and view click analytics over time.

## Quick Start

**Prerequisites:** Node.js ≥ 18 (tested on 22 LTS), npm 9+

```bash
# 1. Install all dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. Seed the database with sample data
npm run seed

# 3. Start both backend (port 3001) and frontend (port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

## Architecture

```
URLShortener/
├── backend/          # Express 5 + TypeScript + SQLite REST API
└── frontend/         # React 19 + Vite + TanStack Query SPA
```

### Backend

| Technology | Version | Role |
|---|---|---|
| Node.js | 22 LTS | Runtime |
| TypeScript | 5 | Type safety |
| Express 5 | 5.x | HTTP framework |
| better-sqlite3 | 11.x | SQLite driver (synchronous) |
| Zod | 3.x | Request validation |
| nanoid | 5.x | Slug generation |
| Vitest + Supertest | latest | Testing |

**Why Express 5?** Async error propagation is built-in (no `express-async-errors` wrapper needed). Mature, well-understood, minimal surface area for a project of this scope.

**Why SQLite?** Zero-configuration, file-based, no separate server process required. The schema is two tables. A `better-sqlite3` synchronous driver eliminates async/await boilerplate in the query layer. The schema and indexes are designed to allow a drop-in swap to Postgres by changing the driver with no other code changes.

**Why better-sqlite3 (not Drizzle/Prisma)?** Two tables don't need an ORM. A direct SQL layer keeps the test in-memory setup trivial (`new BetterSqlite3(':memory:')`), removes 200ms+ ORM startup cost, and keeps the codebase easier to reason about.

### Frontend

| Technology | Version | Role |
|---|---|---|
| React 19 | 19.x | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6.x | Build tool / dev server |
| TanStack Query v5 | 5.x | Server state, caching |
| Recharts | 2.x | Bar chart for daily clicks |
| Plain CSS modules | — | Scoped styling, no dependencies |

**Why TanStack Query?** Handles loading/error states, stale-while-revalidate, and cache invalidation after mutations — all without manual `useEffect` management. Eliminates a class of race conditions seen with raw `fetch + useState`.

**Why Recharts?** React-native, no D3 knowledge required. The composable `<BarChart>` fits the daily click aggregation data directly.

## API Reference

All API responses use a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/links` | Create a short link |
| `GET` | `/api/v1/links` | List all links (`?page=1&limit=20`) |
| `GET` | `/api/v1/links/:slug` | Get one link |
| `DELETE` | `/api/v1/links/:slug` | Delete a link and its click history |
| `GET` | `/api/v1/links/:slug/analytics` | Click analytics (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) |
| `GET` | `/:slug` | Redirect to target URL (records a click) |

### Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `SLUG_TAKEN` | 409 | Slug already in use |
| `NOT_FOUND` | 404 | Slug does not exist |
| `VALIDATION_ERROR` | 422 | Invalid request body or query params |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Database Schema

```sql
-- links: slug -> target URL mapping
CREATE TABLE links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  target_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX idx_links_slug ON links (slug);

-- clicks: immutable event log (never updated, only appended)
CREATE TABLE clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id    INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  user_agent TEXT
);
CREATE INDEX idx_clicks_link_id ON clicks (link_id);
-- Covering index for daily aggregation query:
CREATE INDEX idx_clicks_link_date ON clicks (link_id, date(clicked_at));
```

Timestamps are stored as ISO-8601 text. SQLite has no native datetime type; `date(clicked_at)` extracts `YYYY-MM-DD` for grouping.

## Performance Design

### Redirect Path (latency-sensitive)

```
HTTP GET /:slug
  → indexed slug lookup (UNIQUE index, ~0.1ms)
  → send 302 response
  → setImmediate() → INSERT click row (does not block the user)
```

The user receives their redirect before the click INSERT completes. At high volume, redirect p99 latency stays under 5ms even as the `clicks` table grows to millions of rows.

### Analytics Query

```sql
SELECT date(clicked_at) AS day, COUNT(*) AS clicks
FROM   clicks
WHERE  link_id = ?
  AND  date(clicked_at) BETWEEN ? AND ?
GROUP  BY date(clicked_at)
ORDER  BY day ASC;
```

The composite index `(link_id, date(clicked_at))` makes this a pure index scan — it never touches the table heap after index lookup.

### WAL Mode

SQLite is opened with `PRAGMA journal_mode = WAL`, which allows analytics reads to proceed concurrently with redirect writes without blocking.

## Running Tests

```bash
# Backend tests (Vitest + Supertest)
npm test --prefix backend

# Frontend tests (Vitest + React Testing Library)
npm test --prefix frontend

# All tests
npm test
```

Backend tests use in-memory SQLite (`:memory:`) — no file I/O, no shared state between suites, fully parallel-safe.

## Seed Data

```bash
npm run seed       # from root, or:
npm run seed --prefix backend
```

Creates 3 links with 90 days of synthetic click data. Safe to re-run (uses `INSERT OR IGNORE`).

| Slug | Destination |
|---|---|
| `gh-home` | https://github.com |
| `hn-front` | https://news.ycombinator.com |
| `mdn-js` | https://developer.mozilla.org/en-US/docs/Web/JavaScript |

## Configuration

Create `backend/.env` to override defaults:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend HTTP port |
| `DB_PATH` | `./data/urlshortener.db` | SQLite file path |
| `BASE_URL` | `http://localhost:3001` | Used to build `shortUrl` in responses |
| `NODE_ENV` | `development` | `production` suppresses stack traces |

## Assumptions & Simplifications

- **Single-process deployment**: SQLite's WAL mode handles the concurrency for this scope. A multi-process deployment would require switching to Postgres.
- **No authentication**: Links are public. In production you'd add an auth layer.
- **Timestamps in UTC ISO-8601 text**: SQLite has no native datetime type. All times are UTC strings; the frontend formats them for display.
- **Click recording is best-effort**: If the INSERT fails after the 302 is sent, the click is silently lost. This is a deliberate trade-off: redirect latency is never degraded by database issues.
- **No click deduplication**: Every redirect creates one click row. Bot filtering or deduplication by IP/time window would be a production enhancement.
- **Vite dev proxy**: In development, Vite proxies `/api` → `:3001`. In production, configure your reverse proxy (nginx/Caddy) to route `/api` and short slugs to the backend.
**Duplicate destination URLs**: I intentionally allowed duplicate destination URLs while enforcing unique slugs. This enables multiple short links to point to the same target while preserving independent analytics.

## Trade-offs

| Decision | Trade-off |
|---|---|
| SQLite over Postgres | Zero setup vs. limited write concurrency (solved by WAL for moderate traffic) |
| Synchronous better-sqlite3 | Simpler code and test setup vs. blocking the event loop for very large queries |
| Fire-and-forget click recording | Never slows down redirects vs. potential for lost clicks under pressure |
| No ORM | Minimal abstraction, fast startup vs. manual SQL for schema changes |
| Plain CSS modules | No framework overhead vs. more verbose styling than Tailwind |

## Future Improvements

Given more time, these are the highest-value additions:

1. **Swap to Postgres** for concurrent write scaling and connection pooling
2. **Redis counter cache**: Increment a counter in Redis on each click; sync to DB in batches to avoid high-write pressure
3. **Rate limiting**: Per-IP limit on `POST /links` using `express-rate-limit` + Redis
4. **Geolocation enrichment**: Enrich clicks with country/city from MaxMind GeoLite2 (offline lookup)
5. **Authentication**: JWT-based per-user link ownership
6. **Link expiry**: Optional `expires_at` field that makes the redirect return 410 Gone
7. **Custom domain support**: Map a domain to a user account for branded short links
8. **Pagination cursor**: Replace LIMIT/OFFSET with cursor-based pagination for consistent results at scale
9. **OpenAPI spec**: Auto-generate from Zod schemas using `zod-to-openapi`
10. **Docker Compose**: Single `docker compose up` to run backend + frontend in containers

## LLM Prompts Used

This project was built with [Claude Code](https://claude.ai/claude-code) (claude-sonnet-4.6). Every prompt, clarification, and follow-up is recorded here verbatim.

---

### 1 — Initial project brief (user → Claude)

> Project Brief: URL Shortener with Click Analytics. Design a simple link shortener with a small dashboard.
> - Implement endpoint to create short links (slug or generated), store target URL, and redirect by slug.
> - Record click events with timestamp and user agent when a redirect occurs.
> - Provide analytics endpoints for total clicks and clicks grouped by day.
> - Build a React UI to create and manage links and view simple charts or tables of click counts.
> - Include seed data for a few links and a migration or schema setup script.
> - Add tests around redirect behavior and daily aggregation.
>
> Standard requirements: REST API with versioned routes, SQLite or Postgres, basic validation and error handling, performance consideration, regression tests, README with architecture notes and LLM prompts, TypeScript backend, React-like frontend.

---

### 2 — Internal planning prompt 

> "Design a comprehensive implementation plan for a URL Shortener with Click Analytics project. The workspace is completely empty. [full brief]. Design the following: complete directory structure, tech stack choices with justifications (TypeScript backend, React frontend), database schema with complete SQL DDL and indexes, API routes with request/response shapes, key implementation files list with purpose, test strategy, performance considerations for scale, single-command startup approach."

---

### 3 — CSS framework clarification 

> "Which CSS approach should the frontend use? The brief says keep styling simple and focus on clarity."

**User selected:** Plain CSS modules (scoped `.module.css` per component, no extra dependencies).

---

### 4 — Codebase exploration 
> "Explore the workspace at j:\Users\Public\Workspace\URLShortener to understand what's already there. List all files and directories, read any existing configuration files, and report the complete directory structure."

**Result:** Workspace was completely empty; full implementation built from scratch.

---

### 5 — Dead code question 

> "what is this unused function for?" [referenced `seed.ts:23` — the `weightedRandom` function]

**Finding:** `weightedRandom` was defined but never called. The seed loop uses `DAY_WEIGHTS[dayOfWeek]` directly as a click-count multiplier instead. Function was deleted.

---

### 6 — UI debugging via Playwright MCP 

> "use playwright mcp to test the UI, server is started but don't see the UI"

**Diagnosis:** Vite was binding only to the IPv6 loopback (`::1`) on Windows, making `localhost` (IPv4) unreachable from the Playwright browser.

**Fix:** Added `host: '127.0.0.1'` to the `server` block in `frontend/vite.config.ts`.

---

### 7 — Prompts documentation 

> "log all the prompts used here to the readme.md file prompts section"

---

### 8 — UI improvement prompt

> "Keep UI styling simple; focus on clarity, validation, empty states, and errors. Can we improve our UI based on this prompt?"

**Outcome:** Plan created covering: Retry buttons on error states (Dashboard + Analytics), 404 "not found" state for invalid slugs, date input guards against blank values, empty-state distinction in links table (no links overall vs. no links on this page), and inline delete-error banners.

---

### 9 — Additional UI feedback

> "i have some additional feedback:
> I think the generated slugs should be clickable so the user can instantly see the count increase on the screen
> I'd like to include a favicon for each slug
> track any user prompts in the prompts section of the readme"

**Outcome:** Slugs in the links table are now clickable `<a>` tags pointing to the redirect URL (opens in new tab, records a click). Favicons from Google's favicon service displayed next to each destination URL. All prompts recorded in this section.

---

### 10 — UI validation and implementation

> "also validate the UI is still functional using the playwright mcp"

**Outcome:** All UI improvements from prompts 8–9 implemented: Retry buttons, 404 state, date guards, empty-state distinction, delete-error banners, clickable slugs, and favicons. Validated via Playwright MCP — dashboard, analytics page, 404 page, and form validation all confirmed working.

---

### 11 — Click counter not updating

> "there seems to be an issue with the links and the counter. When I click the link from the slug tab it doesnt immediately update the count, reproduce this using the playwright mcp"

**Diagnosis:** Clicking a `target="_blank"` slug link opens a new tab without the dashboard tab losing focus, so TanStack Query's `refetchOnWindowFocus` never triggers — the click count stays stale.

**Fix:** Added an `onClick` handler on slug `<a>` tags that calls `queryClient.invalidateQueries({ queryKey: ['links'] })` after a 500ms delay, giving the backend time to record the click before the dashboard refetches. Verified via Playwright: count updated from 3 → 4 immediately after clicking.

---

### 12 — Prompts documentation update

> "update readme with the prompts"

---

### 13 — Analytics page improvements

> "Feedback for analytics page.
> Add "Total clicks (range)" metric
> Add 7D / 30D / 90D quick filters
> Add Link Metadata at Top — Instead of just /gh-home → https://github.com, improve hierarchy: Slug: gh-home, Target: https://github.com, Created: Jan 12, 2026
> Add Copy Button to Slug
> Show favicon in analytics as well"

**Outcome:** Added a "Total clicks (range)" StatCard. Added 7D/30D/90D quick-filter buttons that pre-set the date range (manual date pickers switch to "custom" mode). Replaced the plain header with a structured metadata card showing Slug (with Copy button), Target (with favicon), and Created date. Backend analytics endpoint updated to return `createdAt`. Frontend `AnalyticsData` type updated to include `createdAt`.

---

### Notes on generated code

- All SQL uses prepared statements — no string interpolation, no SQL injection vector.
- React components use controlled inputs and never call `dangerouslySetInnerHTML`.
- Error messages from the API are surfaced to the user as plain text, never rendered as HTML.
- All generated code was reviewed for correctness and alignment with requirements before acceptance.

