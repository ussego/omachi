# omastats

Analytics dashboard for the Omarchy plugin catalog. Cloudflare Worker (Hono) +
D1, React SPA frontend (TanStack Router + Query, coss ui, dither-kit charts).

<p align="center">
  <img src="./public/og.png" alt="omastats share card" width="720" />
</p>

The share card and favicon render at build time with
[takumi](https://takumi.kane.tw), no headless browser, using the same
dither-kit engine the charts run on. See [Brand assets](#brand-assets).

## Architecture

- **Cron triggers** live in `.github/workflows/`. `light-poll.yml` runs every
  30 min and `heavy-poll.yml` every 6 h; each fires a `curl` to the matching
  `/api/admin/...` endpoint, gated by a `secrets.ADMIN_TOKEN` repo secret
  (same value as the Worker secret). The Worker still has a `scheduled()`
  handler for `wrangler triggers` and local miniflare, but production cadence
  is owned by GitHub Actions.
  - **Light poll** (`POST /api/admin/light-poll`): fetches `catalog.json` and
    inserts rows for plugin IDs not yet in `plugins`, keeping the live plugin
    count fresh. Cheap: no zod, no per-plugin loop, no snapshot writes.
  - **Heavy poll** (`POST /api/admin/snapshot`): fetches `catalog.json` +
    `/v1/stats`, validates with Zod, upserts plugins (metadata + denormalized
    `current_*` stats columns), appends one snapshot row per plugin, logs
    verification/update events by diffing against the previous snapshot, and
    prunes snapshots older than 90 days.
  - **Note**: GitHub Actions cron has no SLA — occasional missed firings are
    documented upstream. If the original "failing occasionally" was caused by
    Workers CPU/D1 caps, this migration does not fix that; diagnose separately.
- **D1**: `plugins` (dimension, carries denormalized `current_*` so leaderboard/
  list reads never scan snapshots), `plugin_snapshots` (fact, 90-day retention),
  `verification_events` / `update_events` (derived).
- **API** served by the same Worker (see routes below).

Both upstream endpoints are current-state snapshots; history only accumulates
from the first cron run onward.

## Brand assets

`bun run assets` renders the brand images into `public/` with takumi. Build
time only; the Worker bundle never imports it.

- **`og.png`** - the 1200×630 share card above.
- **`favicon.ico`** (16/32/48) and **`favicon.png`** (64) - a blue dither "o"
  on the dark rounded tile.

<p align="center">
  <img src="./public/favicon.png" alt="omastats favicon" width="64" />
</p>

Both reuse the site's own dither engine. `scripts/assets.tsx` imports
`paintColumn` and the palette seeds from `src/components/dither-kit/`,
rasterizes them to raw-RGBA bitmaps, and blooms them the same way the charts
bloom. `bun run build` runs `assets` first, so the deployed copy stays
current, and the script prints an ASCII preview of the favicon while it
renders.

## Setup

```txt
bun install
bun run assets       # regenerate public/og.png + favicons (also runs on build)
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

Or against production (admin token, same as the GH Actions `ADMIN_TOKEN` repo
secret and the Cloudflare `ADMIN_TOKEN` Worker secret):

```txt
curl -X POST -H "x-admin-token: $ADMIN_TOKEN" https://stats.ussego.com/api/admin/snapshot
curl -X POST -H "x-admin-token: $ADMIN_TOKEN" https://stats.ussego.com/api/admin/light-poll
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
| `POST /api/admin/snapshot` | force a heavy poll now; header `x-admin-token` (Worker secret `ADMIN_TOKEN`) |
| `POST /api/admin/light-poll` | force a light poll now; header `x-admin-token` (Worker secret `ADMIN_TOKEN`) |

`range` accepts `30d|90d|180d|365d|1y|all`; `from`/`to` are ISO dates. Buckets are UTC-based (ISO strings).
