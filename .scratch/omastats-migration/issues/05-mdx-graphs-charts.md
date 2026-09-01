Status: done
Type: task
Blocked by: 03, 04

# Charts: dither-kit → mdx-graphs

Use the mdx-graphs skill for install/props. This ticket is the call-site
map and slug assignment — see the spec's slug table for the full
dither→mdx-graphs mapping and the rule that JSX-only components (flow,
plot, activity, heatmap, calendar, timer, countdown, frame) never get an
ASCII twin.

`DitherButton` and `DitherAvatar` are **not** in scope here — see issue
04 (they're not charts).

## Call sites

- **`src/routes/index.tsx`** (trending curves: updated/verified/published/total):
  `Area`, `AreaChart`, `DitherColor`, `ChartTooltip`, `XAxis`, `YAxis` →
  `GraphSpark`, `palette="multi"` (multi-series).
- **`src/routes/plugins/$pluginId.tsx`** (per-plugin metric history):
  `Area`, `AreaChart`, `Legend`, `ChartTooltip`, `XAxis`, `YAxis` →
  `GraphSpark` (single series, per spec table).
- **`src/routes/leaderboards.tsx`**: `Bar`, `BarChart`, `DitherColor`,
  `Sparkline`, `ChartTooltip`, `YAxis` → the ranked rows become
  `GraphRank`; the per-row `Sparkline` becomes a per-row `GraphSpark`.
- **`src/routes/categories.tsx`**: `Bar`, `BarChart`, `DitherColor`,
  `ChartTooltip`, `XAxis`, `YAxis` (category counts/engagement) →
  `GraphStack` (parts-of-a-whole, per spec table — not a bar chart
  1:1 port).
- **`src/routes/health.tsx`**: `BlockLegend`, `DitherColor`, `Pie`,
  `PieChart`, `ChartTooltip` (verification/install-status breakdown) →
  `GraphStack`, **not** a pie (mdx-graphs has no pie primitive; "Stack or
  Waffle" per its own rules). `BrokenPluginsTable` and
  `UnverifiedPluginsTable` (already shadcn `Table`, not dither) become
  `GraphTable` per the spec's slug table, or stay as shadcn `Table` if a
  totals row doesn't earn the swap — pick one and don't do both.

## Acceptance

- No file imports from `@/components/dither-kit/*` except during an
  in-progress commit within this issue.
- Every chart above renders with `--graph-accent` (single series) or
  `palette="duo"`/`"multi"` only where a second/third series is real data,
  not decoration.
- At most the components listed in the spec's slug table are used; no new
  chart library, no SVG/canvas/Recharts introduced.
