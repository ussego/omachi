Status: done
Type: task

# Shell migration: Vite-SSR-with-Hono → TanStack Start

## Scope

Stand up the omachi root (already a TanStack Start + shadcn scaffold) as
the real app shell, replacing everything Hono-rendered in
`omachi/omastats/`.

### `wrangler.jsonc` (repo root)

Merge `omachi/omastats/wrangler.jsonc` into `omachi/wrangler.jsonc`:
- `name`: `"omachi"` (ADR-0001 — not `"omastats"`).
- `main`: point at the TanStack Start Cloudflare entry (default
  `@tanstack/react-start/server-entry` is fine — no custom `server.ts` is
  needed since we're not adding a `scheduled` export; see spec's Out of
  Scope).
- Copy verbatim: `d1_databases` (binding `DB`, `database_name`/`database_id`
  unchanged), `routes` (`stats.ussego.com` custom domain), `vars`
  (`CATALOG_URL`, `STATS_URL`), `observability`. `ADMIN_TOKEN` is a secret,
  not in `wrangler.jsonc` — carries over however it's currently set
  (`wrangler secret put` / dashboard), nothing to change in code.
- Keep `migrations_dir`/`migrations_pattern` pointing at the copied
  `migrations/` folder (see below).

### `package.json` (repo root)

Merge omastats' deps/scripts into the root `package.json`:
- Keep: `drizzle-orm`, `d3-scale`, `d3-shape` (chart math, still used by
  mdx-graphs' data prep if needed), `zod`, `tailwind-merge`, `clsx`,
  `motion`, `lucide-react` (omastats' icon set — reconcile with `@tabler/icons-react`
  already in omachi; pick one per shadcn skill guidance, don't ship both).
  `@daypicker/react` only if `calendar` (issue 04) still needs it.
- Drop: `hono`, `vite-ssr-components` (issue 02 removes the last callers),
  `@fontsource/geist-pixel`, `@fontsource-variable/jetbrains-mono` (issue 03).
- Add dev scripts from omastats: `db:generate`, `db:migrate:local`,
  `db:migrate:remote`, `cf-typegen`, `assets` (build-time brand assets,
  issue 06), `typecheck` (adapt — omachi is a single Vite environment, not
  worker+client tsconfigs; one `tsc --noEmit` may suffice, confirm against
  `tsconfig.json`).
- `deploy` script already exists in omachi's `package.json`; keep it.

### D1 schema & migrations

Copy `omastats/src/db/schema.ts` → `omachi/src/db/schema.ts` and
`omastats/migrations/` → `omachi/migrations/` unchanged (out of scope for
edits, just relocation). Copy `omastats/drizzle.config.ts` too.

### Routes

Port every route under `omastats/src/routes/` into `omachi/src/routes/`
using TanStack Start file conventions (drop the `.lazy.tsx` split files —
that pattern existed for the old Vite/Hono-era manual code-splitting;
TanStack Start's router plugin auto-code-splits, so each route becomes one
file, not a `.tsx`/`.lazy.tsx` pair):

- `index.tsx` → `index.tsx`
- `badges.tsx` + `badges.lazy.tsx` → `badges.tsx`
- `categories.tsx` + `.lazy.tsx` → `categories.tsx`
- `charts.tsx` + `.lazy.tsx` → `charts.tsx`
- `health.tsx` + `.lazy.tsx` → `health.tsx`
- `leaderboards.tsx` + `.lazy.tsx` → `leaderboards.tsx`
- `plugins/$pluginId.tsx` + `.lazy.tsx` → `plugins/$pluginId.tsx`
- `authors/$authorId.tsx` + `.lazy.tsx` → `authors/$authorId.tsx`

Components each route renders (`src/components/broken-plugins-table.tsx`,
`command-palette.tsx`, `snippet.tsx`, `stat-card.tsx`, `trending-table.tsx`,
`unverified-plugins-table.tsx`) move to `omachi/src/components/` as-is for
now — they get their coss imports swapped in issue 04 and chart imports
swapped in issue 05.

`src/lib/queries.ts`, `api-types.ts`, `format.ts`, `segmented-control.ts`,
`utils.ts` move to `omachi/src/lib/` unchanged (pure client code, no
Hono/Drizzle deps).

### Root layout

omachi's scaffold already has `src/routes/__root.tsx` +
`src/components/header.tsx`/`footer.tsx`/`theme-toggle.tsx`. Port
omastats' `__root.tsx` content into that structure rather than replacing
it wholesale:
- Nav items (Leaderboards, Ecosystem Health, Categories, Charts, Badges),
  the command palette trigger, GitHub/sponsor links, and the
  mobile hamburger `Sheet` all currently live inline in omastats'
  `__root.tsx` (`RootLayout`) — move that markup into `header.tsx`/
  `footer.tsx`, keeping the responsive trap notes below intact.
- Merge head metadata: omastats' SSR shell (`src/renderer.tsx`) sets
  `SITE_TITLE`/`SITE_DESC`/canonical/OG/Twitter meta and the pre-hydration
  theme-init script. omachi's `__root.tsx` already has an equivalent
  `THEME_INIT_SCRIPT` and a `head()` config — merge the omastats meta
  values in (update title/description copy for the omachi rebrand,
  ADR-0003 — make the "independent companion dashboard" framing explicit
  here).
- Responsive trap (carry forward as a comment, don't lose it): header nav
  links are `whitespace-nowrap` and only fit from `lg`; below that the
  hamburger `Sheet` takes over. Moving the breakpoint to `md` re-breaks the
  header ("Ecosystem Health" wraps to two lines in the fixed-height bar).
  Verify this still holds after the shadcn swap (issue 04) — screenshot at
  `lg` and `sm` per the Done Condition.
- Sequencing note: the full nav needs `Sheet`/`Button`/`Popover`
  (command palette) from shadcn. If issue 04 hasn't landed yet when this
  issue is worked, port the nav with whatever primitives already exist
  (`button.tsx` is already in the omachi scaffold) and revisit once issue
  04 lands — don't block shell standup on the full primitive swap.

### Static routes

`/robots.txt` and `/llms.txt` (currently `app.get(...)` in
`omastats/src/index.tsx`) become TanStack Start server routes:
`src/routes/robots[.]txt.ts`, `src/routes/llms[.]txt.ts` (escaped-dot file
naming per the server-routes convention). Keep the `LLMS_TXT` content,
update copy for the omachi rebrand (ADR-0003).

### Delete once ported

`omastats/src/client.tsx`, `renderer.tsx`, `shell.tsx`, `index.tsx`,
`routeTree.gen.ts` (regenerated fresh at the omachi root), `style.css`
(superseded by issue 03's `styles.css` token work).

## Acceptance

- `bun run dev` boots the Cloudflare Workers local dev server via
  TanStack Start; every route above renders (data may still 404 until
  issue 02 lands — that's fine, this issue is shell-only).
- `bun run generate-routes` regenerates `routeTree.gen.ts` cleanly.
- No file imports `hono`, `vite-ssr-components`, or references
  `client.tsx`/`renderer.tsx`/`shell.tsx`.
