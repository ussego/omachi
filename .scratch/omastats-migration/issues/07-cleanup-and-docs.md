Status: resolved
Type: task
Blocked by: 01, 02, 03, 04, 05, 06

# Cleanup, tests, and docs

Last issue — run through the spec's Done Condition checklist against the
real repo state before closing this.

## Scope

### Self-tests → `bun:test`

Three files, same rename+rewrite recipe for each: rename
`*.selftest.ts` → `*.test.ts`, replace the custom `assert()` calls with
`import { describe, it, expect } from "bun:test"`.
- `omastats/src/lib/snapshot.selftest.ts` → `omachi/src/lib/snapshot.test.ts`
- `omastats/src/lib/badges.selftest.ts` → `omachi/src/lib/badges.test.ts`
- `omastats/src/lib/charts.selftest.ts` → `omachi/src/lib/charts.test.ts`

Add `"test": "bun test"` to `package.json`. Update the self-check line in
`omachi/AGENTS.md` (see below) to reference `bun test` instead of
`bun src/lib/*.selftest.ts`.

### Dead dependency removal

Confirm zero importers (grep before removing each), then drop from
`package.json`: `hono`, `vite-ssr-components`, `dither-kit`,
`@fontsource-variable/jetbrains-mono`, `@fontsource/geist-pixel`, and
whichever of `lucide-react`/`@tabler/icons-react` wasn't kept in issue 01.

### Skills

Delete `.agents/skills/coss/` and `.agents/skills/coss-particles/` (check
`skills-lock.json` too) once `grep -r "coss" src/` (and the skills
themselves) turns up nothing.

### `omachi/AGENTS.md` merge

Rewrite and append omastats' operational knowledge (from
`omastats/AGENTS.md`) below the existing generic skill-loading/issue-tracker
sections, updated for the new stack:
- Architecture/data-flow section: Heavy Poll / Light Poll, the API section
  now describes TanStack Start Server Routes instead of Hono, the frontend
  section describes shadcn instead of coss and mdx-graphs instead of
  dither-kit.
- The "mirror" section (`current_*` denormalization) — unchanged content,
  it's still accurate.
- Budget discipline (D1/CPU caps) — unchanged content, still accurate.
- Drop entirely: the CLI-install jsxImportSource-pragma warning (that was
  a Hono-vs-React JSX default conflict specific to the old dual-tsconfig
  setup; TanStack Start doesn't have that split), the `scheduled()`
  dev-fallback curl instructions, anything naming Hono/coss/dither-kit as
  current.
- Update the repo URL/deploy-workflow reference once you know the final
  GitHub remote (outside this repo's control — ask if unclear at this
  point).

### Delete the reference copy

Once every file `omachi/omastats/` holds has a confirmed new home (cross-check
against issues 01–06), delete `omachi/omastats/` entirely.

### Delete this migration's own scaffolding docs

`MIGRATION.md` (repo root) is already deleted as of the spec being
written — confirm it's gone, don't recreate it.

## Acceptance (repo-wide, from the spec's Done Condition)

- `bun run dev` boots; `bun run build && wrangler deploy` ships a Worker
  named `omachi` under the existing domain/D1/vars.
- No file imports `hono`, `coss`, or `dither-kit`; those three packages
  are gone from `package.json`.
- `bun run typecheck`, `bun run lint`, `bun test` all pass.
- `bun run assets` produces the new ASCII/blue-accent OG + favicon.
- `omachi/omastats/` no longer exists.
- Screenshot the homepage at `lg` and `sm`; confirm the hamburger-vs-row
  nav trap still holds at `lg` (see issue 01's responsive-trap note).
