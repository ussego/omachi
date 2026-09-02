# Omachi

Omachi is an analytics dashboard for the Omarchy plugin catalog: plugin
metadata, popularity metrics, trend charts, embeddable badges, and an
ecosystem explorer graph, served from a D1 mirror of the catalog and its
stats feeds.

**Production:** https://stats.ussego.com · **Source:** https://github.com/ussego/omachi

## Stack

TanStack Start (file-based routes and server routes) on Cloudflare Workers,
with D1 + Drizzle, React, TanStack Router and TanStack Query, shadcn/ui
primitives, and mdx-graphs visualizations. The UI follows the blueprint
design language in `docs/design.md`.

## Development

```bash
bun install
bun run dev        # dev server on port 3000
bun run typecheck  # tsc --noEmit
bun run lint       # Biome, also the formatter
bun test           # bun:test unit tests
```

`bun run build` does not typecheck. The remaining scripts (`deploy`, `db:*`,
`assets`, `cf-typegen`, …) are in `package.json`; bindings and environment
truth live in `wrangler.jsonc`.

## How it works

GitHub Actions polls the Worker's admin endpoints on a schedule: a heavy
snapshot poll four times a day (validates feeds, upserts current state and
history, diffs events), a cheap light poll every 30 minutes (new plugin IDs
only), and an explorer poll once a day (similarity graph). `plugins` mirrors
each plugin's current state, `plugin_snapshots` holds 90 days of history,
and `plugin_relations` carries the explorer graph. The public read APIs and
the dashboard serve from the mirror.

Architecture, query-budget discipline, and conventions are documented in
[AGENTS.md](AGENTS.md); [CONTEXT.md](CONTEXT.md) is the domain model and
`docs/adr/` the decision records.

## Deploy

Pushes to `main` run typecheck, lint, and tests, then deploy through
`.github/workflows/deploy.yml`; `bun run deploy` deploys manually. The Worker
is named `omachi`.
