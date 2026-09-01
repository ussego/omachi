Status: done
Type: task

# Theme: sharp square, blue accent

## Scope

Edit `omachi/src/styles.css` (already base-lyra shadcn, `--radius:
0.625rem` today):

- `--radius: 0` in `:root` (both light and dark inherit it — it's not
  redefined in `.dark`). If `0` visibly breaks cap-borders on `kbd` or
  separators once shadcn primitives are in (issue 04), fall back to `2px`
  for just that case — don't blanket-revert.
- Add the mdx-graphs accent tokens (confirmed names via mdx-graphs'
  `llms.txt`) to both `:root` and `.dark`:
  ```css
  :root {
    --graph-accent: oklch(0.5 0.18 255);
    --graph-accent-2: oklch(0.58 0.12 255);
    --graph-accent-3: oklch(0.42 0.1 255);
  }
  .dark {
    --graph-accent: oklch(0.7 0.12 255);
    --graph-accent-2: oklch(0.62 0.1 255);
    --graph-accent-3: oklch(0.52 0.08 255);
  }
  ```
- Fonts: Geist Sans + Geist Mono are already wired in (`@fontsource-variable/geist`,
  `@fontsource-variable/geist-mono`, `--font-sans`/`--font-mono` in
  `@theme inline`) — nothing to add here. Confirm `omastats/src/style.css`'s
  extra keyframes (`skeleton`, `caret-blink`, `toast-success/error-odd/even`)
  are still needed once shadcn's own toast/skeleton primitives land in
  issue 04; port only the ones actually still referenced, drop the rest.
- Remove `@import "@fontsource-variable/jetbrains-mono"` and
  `@import "@fontsource/geist-pixel"` usage — omastats-only, drop
  the packages too (issue 07).
- Confirm no `rounded-*` utility class survives anywhere under
  `src/` once issue 04 lands (grep for it as part of that issue's
  acceptance, not this one — this issue is tokens only).

## Acceptance

- `--radius` resolves to `0` (or the documented `2px` fallback) on every
  shadcn primitive once issue 04 lands.
- `--graph-accent`/`-2`/`-3` are defined in both light and dark mode and
  visibly change mdx-graphs component color once issue 05 lands.
