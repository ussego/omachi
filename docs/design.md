# Omachi design language: blueprint

Omachi's chrome and charts share one vocabulary: technical-drawing ("blueprint") frames — dashed
rules, `+` corner marks, bracketed mono captions, a single blue accent, Geist Mono. Nothing is
rounded, and nothing adds a second hue. Follow this document for any UI change; extend it when the
language grows.

## Tokens — `src/styles.css` is the single source of truth

- **Fonts**: `--font-sans` Geist Variable; `--font-mono` Geist Mono Variable.
  - Chrome text (wordmarks, nav, tab labels, toggles, footnotes): mono + uppercase.
  - Page headings (`h1`/`h2`): `font-heading` (sans). The mono uppercase voice belongs to chrome
    labels and charts, not to page titles.
- **Radius**: `--radius: 0`. Never add rounding.
- **Accent** (the only hue): `--graph-accent` — blue, hue 255 (light `oklch(0.5 0.18 255)`,
  dark `oklch(0.7 0.12 255)`), plus `--graph-accent-2`/`-3` for secondary series. Everything else
  is neutral.
- **Frame inks**: `--graph-frame` (charts and controls), `--graph-frame-soft` (page frame, roughly
  half the contrast), `--graph-muted`, `--graph-faint`.
- Components use tokens only (`bg-background`, `text-graph-accent`, …). No raw color values.

## Frame grammar (the utilities)

- **Dashed frame** `graph-frame`: repeating-linear-gradient layers on all four edges — 2px dash,
  5px gap (7px period), 1px thick. Used on chart figures, KPI tiles, tab lists, header controls,
  example cards.
- **Sides only** `graph-frame-sides`: the two vertical edges (the page frame).
- **Rules** `graph-rule` (horizontal), `graph-rule-y` (vertical), `graph-rule-soft` (page-frame
  horizontal in soft ink — navbar/footer edges and section separators).
- **Corners** `GraphCorners` (`src/components/graph-frame/graph-frame.tsx`): `+` marks straddling
  each corner with a `bg-background` punch-out; props `mark`, `ink` (default `text-graph-frame`),
  `corners` (which corners get marks; default all four), `className`. Page-frame corners use
  `ink="text-graph-frame-soft"` and are hidden below `sm`.
- **Captions** `GraphTitle`: `[ TITLE ]` straddling the top edge — mono, uppercase, accent. Charts
  only.
- **Marching ants** `graph-frame-march` (styles.css): runs the frame dashes at 0.4s linear
  infinite while the wrapping `.group` is hovered; paused by default; active only under
  `prefers-reduced-motion: no-preference`.

## Page chrome

- **Content**: `max-w-6xl` (72rem), centered. The page frame is soft vertical dashed sides
  (`graph-frame-sides`) running from the navbar's bottom rule to the footer's top rule, with `+`
  corners at the four junctions.
- **Sections**: `GraphRule` (`src/components/graph-frame/graph-rule.tsx`) — a soft dashed horizontal
  rule spanning the full page frame so it connects with the dashed sides (a `-mx-4 sm:-mx-6` bleed
  over the content padding). Use it sparingly: between major regions only — never directly under the
  page header, and never between sibling blocks of one region (adjacent charts, consecutive
  reference blocks). Loading skeletons mirror them so the swap to settled content never jumps.
- **Navbar**: full-width, `bg-background/80 backdrop-blur`, soft dashed rule at the bottom edge.
  Logo `[O]` = the Omachi mark: an accent `O` between brackets, mono, uppercase,
  `tracking-widest`, `aria-label="Omachi — home"` carries the name. Nav links = mono uppercase
  `text-xs`; active page `text-graph-accent`, inactive `text-muted-foreground`. Header controls
  (theme toggle, search, GitHub/Sponsor, menu) all carry the dashed `graph-frame`.
- **Footer**: full-width soft dashed rule at the top; `[O]` brand mark in accent with the Omachi
  name in the muted line beneath; captions mono muted `text-xs`.
- **Tabs** (`src/components/ui/tabs.tsx`): triggers mono uppercase `text-xs`; default variant is a
  dashed `graph-frame` list on `bg-background` with a flat `bg-muted` indicator; the underline
  variant uses a `bg-graph-accent` indicator.
- **KPI tiles** (`GraphStat`, `src/components/graph-stat.tsx`): one dashed-frame figure with a
  `[ TITLE ]`, mono labels and tabular values; `hint` text sits under the label.
- **Dialogs, drawers, and popovers** (the command palette, the mobile menu, the range picker):
  square `bg-background` surfaces with no shadow or solid border. Dialogs and popovers carry the
  full dashed `graph-frame` and four `+` corner marks; drawers draw a dashed rule
  (`graph-rule`/`graph-rule-y`) on the visible edge only, with `+` marks on that edge's corners
  (`GraphCorners` `corners` prop). Group labels, titles, and keycaps are mono uppercase chrome;
  internal dividers use `graph-rule`. The mobile menu lives in `src/components/ui/drawer.tsx`.

## Interaction language

- Hover on interactive chrome fades in the marching-ants frame (200ms) — logo and nav links; the
  same frame shows on `group-focus-visible` for keyboard users.
- Logo hover additionally closes the brackets ~2px (`[ O ]` → `[O]`), 200ms ease-out.
- Motion: 200–220ms ease-out; the march is the only loop; everything respects
  `prefers-reduced-motion`.

## Loading states

- Skeletons are static muted blocks — no shimmer loop (the march is the only loop). They appear
  only after a 250ms grace period (`useSkeletonDelay`, `src/lib/loading.ts`), so fast
  edge-cached loads never flash a placeholder.
- Placeholders mirror the content they replace. Chart skeletons reuse the dashed frame and row
  geometry (`GraphRankSkeleton`, `GraphPlotSkeleton`, `GraphStatSkeleton`,
  `src/components/graph-skeleton.tsx`); table skeletons are one `h-5` bar per row inside the real
  table chrome.
- While a query is inside the grace period the real chart renders with empty data, so the frame
  is already warm when rows fade in.

## Rules

Do:

- Use the `graph-frame` family for any box or border.
- Keep corners square, colors semantic, chrome labels mono uppercase, and the one accent hue.

Don't:

- Add hues beyond the blue accent and neutrals, rounded cards, or solid heavy borders where a
  dashed frame belongs.
- Draw charts with SVG or chart libraries — the glyph vocabulary (`GraphPlot`, `GraphRank`,
  `GraphStack`, …) is the chart language.
- Add loops or pulses beyond the march, or raw color values in components.

## Where things live

- Tokens and utilities: `src/styles.css` (theme block, `@utility` blocks, keyframes).
- Chart primitives: `src/components/graph-frame/`.
- Chrome: `src/components/header.tsx`, `footer.tsx`, `theme-toggle.tsx`, `command-palette.tsx`,
  `graph-stat.tsx`, `src/components/ui/tabs.tsx`; the shell in `src/routes/__root.tsx`.
