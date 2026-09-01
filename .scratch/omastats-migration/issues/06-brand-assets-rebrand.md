Status: open
Type: task
Blocked by: 03

# Brand assets: ASCII OG card + favicon glyph, drop dither-kit

This overrides MIGRATION.md's original "keep the favicon visually
identical" constraint — see the spec's "Brand assets rebrand" section and
ADR-0003 (independent-companion framing matters here too: the OG copy is
a good place to make that explicit).

## Scope

`omastats/scripts/assets.tsx` (takumi, build-time, no headless browser)
moves to `omachi/scripts/assets.tsx`. Keep the pipeline shape (JSX →
takumi → raw RGBA `Bitmap` → PNG/ICO via `pngjs`, writes
`public/og.png`/`public/favicon.ico`/`public/favicon.png`), replace the
content:

- Remove the `paintColumn`/palette-seed dither rendering entirely — no
  more `src/components/dither-kit/dither-paint.ts`/`palette.ts` imports
  from this script.
- **OG card (1200×630)**: dashed `+`-corner frame, `[ TITLE ]` on the top
  edge, Geist Mono, characters only — same visual language as mdx-graphs'
  `GraphSpec`/`GraphSheet` twins (see the mdx-graphs skill's `llms.txt` for
  the exact frame-drawing conventions: `+`, `-`, `|`). Content: title,
  tagline, github link, maybe a stat teaser — reuse the copy already
  drafted for issue 01's root-layout meta merge.
- **Favicon (16–32px)**: no frame at that size — single bold Geist Mono
  glyph (the "o"), rendered in `--graph-accent`'s blue
  (`oklch(0.5 0.18 255)` light-mode value, or its raw RGB equivalent since
  takumi/pngjs work in RGBA — convert once, don't hand-pick a different
  blue). Keep the existing raster-then-alpha-mask approach
  (`pngjs`-decoded glyph → alpha mask → filled with the accent) if it's
  still the simplest path without dither; simplify further if the dither
  step was the only reason for that indirection.

## Acceptance

- `bun run assets` produces `public/og.png` and `public/favicon.ico`/`.png`
  with no dither/bitmap artifacts — clean ASCII/monospace + solid accent
  fill only.
- No import of `src/components/dither-kit/*` remains in `scripts/assets.tsx`.
- `dither-kit` (the npm package) has no remaining importer anywhere in the
  repo after this issue — confirmed before issue 07 removes it from
  `package.json`.
