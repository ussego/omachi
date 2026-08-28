# omastats

Analytics dashboard for the Omarchy plugin catalog. Cloudflare Worker (Hono) +
D1, React SPA frontend (TanStack Router + Query, coss ui, dither-kit charts).

## Architecture

- **Cron triggers** (see `wrangler.jsonc`): `*/30 * * * *` light poll fetches
  `catalog.json` and inserts rows for plugin IDs not yet in `plugins`, keeping
  the live plugin count fresh. `0 */6 * * *` heavy poll fetches `catalog.json`
  + `/v1/stats`, validates with Zod, upserts plugins (metadata + denormalized
  `current_*` stats columns), appends one snapshot row per plugin, logs
  verification/update events by diffing against the previous snapshot, and
  prunes snapshots older than 90 days.
- **D1**: `plugins` (dimension, carries denormalized `current_*` so leaderboard/
  list reads never scan snapshots), `plugin_snapshots` (fact, 90-day retention),
  `verification_events` / `update_events` (derived).
- **API** served by the same Worker (see routes below).

Both upstream endpoints are current-state snapshots; history only accumulates
from the first cron run onward.

## Setup

```txt
npm install
bun run db:generate    # regenerate migrations from src/db/schema.ts
bun run db:migrate:local   # apply migrations to local D1
bun run db:migrate:remote  # apply migrations to remote D1
bun run cf-typegen     # regenerate worker-configuration.d.ts from wrangler.jsonc
bun run dev            # local dev (miniflare + D1 at .wrangler/state)
```

Trigger a snapshot manually in dev:

```txt
curl -X POST http://localhost:5173/cdn-cgi/mf/scheduled
```

## Deploy

```txt
bun run deploy
```

## API routes

| Route | Description |
|---|---|
| `GET /api/health` | last snapshot time, plugin/snapshot counts |
| `GET /api/plugins?q=&category=&author=&kind=&verification=&page=&pageSize=` | list/search plugins + latest stats |
| `GET /api/plugins/:id` | plugin detail, full snapshot history, averages |
| `GET /api/stats/published?range=&groupBy=day\|month\|year&from=&to=` | publish counts over time (from `added_at`) |
| `GET /api/stats/updated?...` | update-event counts over time |
| `GET /api/stats/verified?...&toStatus=verified` | verification-transition counts over time |
| `GET /api/stats/categories` | per-category count + avg hearts/views/copies |
| `GET /api/stats/breakdown` | verification-status + install-status counts, totals |
| `GET /api/stats/heatmap?from=&to=` | category × month counts (from `added_at`) |
| `GET /api/leaderboard/:metric?limit=&sparkPoints=` | top N by `hearts`/`views`/`copies`/`copies_per_view`; `sparkPoints` embeds per-row snapshot history |
| `GET /api/leaderboard/trending?days=7\|30` | biggest hearts/views growth in the last N days |
| `GET /api/authors/leaderboard` | aggregate stats per author |
| `GET /api/health/broken` | plugins with unreachable/failed upstream or repo untouched >365d |
| `POST /api/admin/snapshot` | force a poll now; header `x-admin-token` (Worker secret `ADMIN_TOKEN`) |

`range` accepts `30d|90d|180d|365d|1y|all`; `from`/`to` are ISO dates. Buckets are UTC-based (ISO strings).
