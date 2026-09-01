# omastats → omachi migration

Self-contained spec. `MIGRATION.md` (the original brief) is deleted once this
lands, so nothing here may depend on it surviving.

## Goal

`omachi/omastats/` is a full, working copy of the omastats product (Vite-SSR
+ Hono + D1/Drizzle API, coss UI, dither-kit charts) kept only as a
reference. `omachi/` (repo root) is a fresh TanStack Start + shadcn scaffold.
This effort ports omastats into the omachi root as the single, real app —
new runtime shell, new UI primitives, new charts — then deletes the
`omachi/omastats/` reference copy. omachi *is* the next version of
omastats: same product, same data, same deployed Worker, better code.

Read `omachi/CONTEXT.md` for domain vocabulary (Plugin, Snapshot, Heavy
Poll, Light Poll, Verification/Update Event, Leaderboard, Badge, Chart
Series) and `omachi/docs/adr/` for the three decisions this plan depends on:
Worker renamed but D1 database unchanged (ADR-0001), Hono dropped for
native TanStack Start Server Routes (ADR-0002), and the "omachi" name kept
despite echoing "Omarchy" (ADR-0003).

## Out of scope (stays exactly as-is)

- D1 schema, migrations (`omastats/migrations/`, `omastats/src/db/schema.ts`).
- The polling logic itself: `runSnapshot()` (`src/lib/snapshot.ts`) and
  `pollNewPlugins()` (`src/lib/light-poll.ts`). Only their callers move (from
  Hono routes to TanStack Start server routes).
- GitHub Actions workflows (`light-poll.yml`, `heavy-poll.yml`): they keep
  curling `POST /api/admin/snapshot` and `POST /api/admin/light-poll` with
  `x-admin-token: $ADMIN_TOKEN`, unchanged.
- No Cloudflare Cron Triggers, no `scheduled()` Worker export. The old
  `scheduled()` handler was already a dev-only fallback (per omastats'
  AGENTS.md) with no `triggers.crons` wired up in `wrangler.jsonc`; it is
  dropped, not ported.
- Chart/badge *providers* (business logic): `src/lib/charts.ts` and
  `src/lib/badges.ts` move unchanged. Only their route-layer callers change.
- `stats.ussego.com` custom domain route, `CATALOG_URL`/`STATS_URL` vars,
  `ADMIN_TOKEN`, D1 binding (`database_name`/`database_id`) — all copied
  into the final `wrangler.jsonc` verbatim. See ADR-0001.

## Deploy identity (final `wrangler.jsonc`)

- `name`: `"omachi"` (was `"omastats"`).
- `main`: the new TanStack Start entry (see Issue 01).
- Everything else (`d1_databases`, `routes`, `vars`, `observability`)
  copied byte-for-byte from `omastats/wrangler.jsonc`.
- `compatibility_date`/`compatibility_flags`: keep `nodejs_compat`; bump the
  date only if the TanStack Start Cloudflare preset requires it.

## Deep-module principle for this migration

Small interface, deep implementation, fewer files. Before adding a new
file or export, apply the deletion test: if removing it would push
complexity back into its callers, keep it; if removing it makes
complexity vanish, it wasn't earning its keep. Concretely:
- API routes: one file per resource, Drizzle query logic inline (most
  queries have exactly one caller — their own route). Only genuinely
  shared helpers (`withoutCurrent`, `latestFrom`, `dateRange`,
  `chartGroupBy`, `countsRoute`, etc.) move to one `src/lib/api-helpers.ts`.
- Cross-cutting concerns get exactly one implementation: one global
  request middleware for edge caching, one small `adminAuth` middleware
  for the two admin routes. Never copy-paste either into individual route
  files.
- No wrapper module that only re-exports a shadcn/mdx-graphs primitive.

## Charts: dither-kit slug → mdx-graphs slug

Data shape stays `{ points: [{date, count}], title, total }` from the
existing `/api/charts/*` endpoints (unchanged). Use the mdx-graphs skill
for install/props; this table is just the mapping.

| Existing chart | mdx-graphs slug | Notes |
|---|---|---|
| Trending curves (`updated`, `verified`, `published`, `total`) | `GraphSpark` | Per-series sparkline, no axes. `palette="multi"` if multi-series. |
| Per-plugin `sparkPoints` | `GraphSpark` | One spark per row. |
| Leaderboard (`/api/leaderboard/:kind`) | `GraphRank` | `{label, value}` rows, desc. |
| Per-author totals | `GraphRank` | Same shape. |
| Category breakdown (`/api/stats/categories`) | `GraphStack` | Parts-of-a-whole. |
| Single KPI hero | `GraphStat` (2–4 numbers) or `GraphKpi` (one + delta) | Direct. |
| Broken plugins | `GraphTable` | With totals row. |
| Status / uptime | `GraphUptime` | Per-day status glyphs. |
| Before/after snapshot comparison | `GraphSlope` (Y1→Y2) or `GraphCompare` | Pick per density. |
| Goal vs actual | `GraphBullet` | Direct. |
| Funnel / pipeline | `GraphFunnel` | Direct. |
| Timeline | `GraphTimeline` | Direct. |
| Heatmap (`/api/stats/heatmap`) | `GraphHeatmap` | JSX-only, no ASCII twin. |
| Activity / calendar | `GraphActivity` (JSX-only) or `GraphWaffle` | Pick per density. |

Components with no ASCII twin **must stay JSX**: flow, plot, activity,
heatmap, calendar, timer, countdown, frame.

## Theme tokens

- `--radius: 0` everywhere (fallback `2px` only if `0` visibly breaks
  cap-borders on `kbd`/separators).
- Fonts: Geist Sans + Geist Mono (`@fontsource-variable/geist`,
  `@fontsource-variable/geist-mono`) — already installed in the omachi
  scaffold, nothing to add. Drop `@fontsource-variable/jetbrains-mono` and
  `@fontsource/geist-pixel` (omastats-only, superseded).
- Accent — the "blue" mdx-graphs palette (confirmed CSS var names from
  mdx-graphs' `llms.txt`):
  ```css
  --graph-accent:   oklch(0.5 0.18 255);   /* dark: oklch(0.7 0.12 255) */
  --graph-accent-2: oklch(0.58 0.12 255);  /* dark: oklch(0.62 0.1 255) */
  --graph-accent-3: oklch(0.42 0.1 255);   /* dark: oklch(0.52 0.08 255) */
  ```

## Brand assets rebrand (in scope — overrides the original brief)

`scripts/assets.tsx` (takumi, no headless browser) is the build-time
pipeline for `public/og.png` / `public/favicon.*` and stays. What it draws
changes: drop the dither-kit `paintColumn`/bitmap rendering entirely, draw
ASCII/monospace content instead, matching mdx-graphs' visual language
(Geist Mono, dashed `+`-corner frame, `[ TITLE ]`, characters only, one
accent). Concretely:
- OG card (1200×630): a `GraphSpec`/`GraphSheet`-style dashed frame with a
  title and a few label/value rows.
- Favicon (16–32px): a frame doesn't survive that small — a single bold
  Geist Mono glyph (the "o") in the accent color, no frame.
- `dither-kit` becomes deletable as an npm dependency once this lands
  (nothing imports it anymore — simpler than the original "keep it just
  for this script" plan).

## Done condition

- `bun run dev` boots a Cloudflare Workers local dev server with
  TanStack Start.
- `bun run build && wrangler deploy` ships a Worker named `omachi` serving
  the SPA shell, the API routes (as TanStack Start Server Routes), under
  the existing `stats.ussego.com` domain and `omastats` D1 database.
- Every page that rendered a dither-kit chart now renders the matching
  mdx-graphs component in the sharp-square shadcn theme with the blue
  accent.
- No file imports `hono`, `coss`, or `dither-kit`. `hono`,
  `vite-ssr-components`, and `dither-kit` are removed from `package.json`.
  `src/components/dither-kit/` and the coss `src/components/ui/` entries
  are deleted.
- `.agents/skills/coss/` and `.agents/skills/coss-particles/` deleted (no
  page imports coss).
- `bun run typecheck`, `bun run lint`, and `bun test` pass.
- `bun run assets` produces a `public/og.png` + `public/favicon.*` in the
  new ASCII/blue-accent style (not a visual match to the old dithered
  version — that constraint is dropped along with dither-kit).
- `omachi/AGENTS.md` reflects the new stack (TanStack Start Server Routes,
  shadcn, mdx-graphs) and folds in omastats' operational knowledge
  (architecture/data-flow, the current-state mirror, D1/CPU budget
  discipline), rewritten to drop every dead reference (Hono, coss,
  dither-kit, the `scheduled()` fallback).
- `omachi/omastats/` is deleted.
- One homepage screenshot on `lg` and one on `sm`. Hamburger-vs-row nav
  trap still holds at `lg`.

## Issues

Work roughly in order; later issues depend on earlier ones landing.

1. `issues/01-shell-migration.md` — wrangler/package.json identity, port
   routes into TanStack Start file-based routing, retire
   client.tsx/renderer.tsx/shell.tsx.
2. `issues/02-api-server-routes.md` — Hono → TanStack Start Server Routes
   for all `/api/...` endpoints, edge-cache + admin-auth middleware.
3. `issues/03-theme-tokens.md` — radius, fonts, accent tokens.
4. `issues/04-shadcn-primitives.md` — coss → shadcn for all 21 primitives.
5. `issues/05-mdx-graphs-charts.md` — dither-kit → mdx-graphs per the slug
   table above.
6. `issues/06-brand-assets-rebrand.md` — ASCII OG/favicon, drop dither-kit
   dependency.
7. `issues/07-cleanup-and-docs.md` — selftest → bun:test, dead-dependency
   removal, AGENTS.md merge, delete `omachi/omastats/`.
