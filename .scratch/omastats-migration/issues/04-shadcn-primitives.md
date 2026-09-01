Status: done
Type: task
Blocked by: 03

# Primitives: coss → shadcn/ui

Use the shadcn skill for install mechanics (`bunx --bun shadcn@latest add
<name> [...]`, one command for all). This ticket is the scope list and
call-site map — don't re-derive it from scratch.

## Components to install (coss → shadcn equivalents)

`autocomplete`, `badge`, `button` (already present in the omachi scaffold —
diff it against the coss version's variants before assuming it's a
drop-in), `calendar`, `card`, `combobox`, `command`, `empty`, `input`,
`kbd`, `pagination`, `popover`, `scroll-area`, `sheet`, `skeleton`,
`spinner`, `table`, `tabs`, `toast`, `toggle`, `tooltip`.

New files use kebab-case names, same as coss (`autocomplete.tsx`,
`scroll-area.tsx`, etc.) — land in `omachi/src/components/ui/`, replacing
the copies ported from `omastats/src/components/ui/`.

## Call sites (every `@/components/ui/*` import to update)

- `src/routes/__root.tsx` (post issue-01 port, now the header/footer
  components): `button`, `sheet`, `toast`
- `src/components/command-palette.tsx`: `button`, `command`, `kbd`
- `src/components/snippet.tsx`: `button`
- `src/components/stat-card.tsx`: `card`, `tooltip`, `skeleton`
- `src/components/broken-plugins-table.tsx`: `badge`, `skeleton`, `table`
- `src/components/trending-table.tsx`: `skeleton`, `table`
- `src/components/unverified-plugins-table.tsx`: `badge`, `skeleton`, `table`
- `src/routes/index.tsx`: `button`, `calendar`, `popover`, `skeleton`,
  `table`, `tabs`
- `src/routes/leaderboards.tsx`: `button`, `skeleton`, `table`, `tabs`
- `src/routes/categories.tsx`: `skeleton`, `tabs`
- `src/routes/health.tsx`: `empty`, `skeleton`, `tabs`
- `src/routes/badges.tsx`: `table`
- `src/routes/authors/$authorId.tsx`: `empty`, `skeleton`, `table`
- `src/routes/plugins/$pluginId.tsx`: (check for `ui/*` imports beyond
  what's listed for dither-kit in issue 05 — re-grep before starting,
  the file wasn't fully read during planning)

`autocomplete`/`combobox`/`pagination` have no confirmed call site from
this pass — install them anyway (spec says install all 21), but don't
force a usage that doesn't exist; flag if truly unused after the full
port so a follow-up can decide whether to drop them.

### `DitherButton` → shadcn `button` (not a chart, handle here not in issue 05)

`omastats/src/components/dither-kit/button.tsx` is a dither-styled
generic button, not a data visualization — it doesn't belong in issue 05's
chart swap even though it lives under `components/dither-kit/`. Replace
its three call sites with the shadcn `Button` from this issue:
`src/routes/badges.tsx`, `src/routes/charts.tsx`,
`src/routes/plugins/$pluginId.tsx`.

### Gap: `DitherAvatar` has no shadcn equivalent in the 21-item list

`omastats/src/components/dither-kit/avatar.tsx` (`DitherAvatar`, used in
`src/routes/authors/$authorId.tsx` and `src/routes/leaderboards.tsx`)
generates a deterministic per-name avatar glyph. It isn't in MIGRATION's
21-component shadcn list and it isn't a chart (no mdx-graphs slug fits an
avatar). Pick one before finishing this issue: (a) add shadcn's `avatar`
as a 22nd primitive and pair it with a small deterministic-color/initials
helper, or (b) write one small inline component in
`src/components/plugin-avatar.tsx` (initials + a color derived from the
name's hash, sharp-square per the theme) — no dither, no dependency.
Either is fine; don't leave `DitherAvatar` as the last dither-kit import
standing.

## Acceptance

- Every path above imports from the new shadcn files, not
  `omastats/src/components/ui/*`.
- `grep -r "rounded-" src/` (excluding `--radius`-driven utility classes
  that resolve through the token, i.e. don't chase `rounded-md`/`rounded-lg`
  that map to `--radius` — chase hardcoded overrides like `rounded-full`
  used for cosmetic rather than radius-token reasons) turns up nothing
  from the coss era.
- `omachi/omastats/src/components/ui/` has no remaining caller anywhere
  under `omachi/src/`.
