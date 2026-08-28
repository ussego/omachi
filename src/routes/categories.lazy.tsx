/** @jsxImportSource react */
import { useMemo, useState } from "react";

import { createLazyFileRoute } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import type { DitherColor } from "@/components/dither-kit/palette";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";

import type { CategoriesResponse } from "@/lib/api-types";
import { fmt } from "@/lib/format";
import { useCategories, useErrorToast, useHeatmap } from "@/lib/queries";

export const Route = createLazyFileRoute("/categories")({
	component: CategoriesPage,
});

type CategoryRow = CategoriesResponse["rows"][number];

const METRICS: {
	value: string;
	label: string;
	color: DitherColor;
	get: (r: CategoryRow) => number | null;
	fmt: (v: number) => string;
}[] = [
	{ value: "count", label: "Plugin count", color: "orange", get: (r) => r.count, fmt: (v) => fmt(v) },
	{ value: "avgHearts", label: "Avg hearts", color: "pink", get: (r) => r.avgHearts, fmt: (v) => fmt(Math.round(v)) },
	{ value: "avgViews", label: "Avg views", color: "blue", get: (r) => r.avgViews, fmt: (v) => fmt(Math.round(v)) },
	{
		value: "avgCopies",
		label: "Avg copies",
		color: "green",
		get: (r) => r.avgCopies,
		fmt: (v) => fmt(Math.round(v)),
	},
];

const MONTH_FMT = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });
const MONTH_SHORT = new Intl.DateTimeFormat(undefined, { month: "short" });

const CELL = 18;
const GAP = 3;
const LABEL_W = 140;
const HEADER_H = 24;
const STEP = CELL + GAP;

/** Custom category × month activity heatmap; raw SVG, no chart library. */
function Heatmap({ points }: { points: { category: string | null; month: string; count: number }[] }) {
	const { rows, months, max, countOf } = useMemo(() => {
		const byCat = new Map<string, { category: string; total: number }>();
		for (const p of points) {
			const c = p.category ?? "(none)";
			const e = byCat.get(c) ?? { category: c, total: 0 };
			e.total += p.count;
			byCat.set(c, e);
		}
		const rows = [...byCat.values()]
			.sort((a, b) => b.total - a.total)
			.slice(0, 15)
			.map((r) => r.category);
		const months = [...new Set(points.map((p) => p.month))].sort();
		const countOf = new Map(points.map((p) => [`${p.category ?? "(none)"}|${p.month}`, p.count]));
		const max = Math.max(1, ...points.map((p) => p.count));
		return { rows, months, max, countOf };
	}, [points]);

	if (rows.length === 0 || months.length === 0) return <Skeleton className="h-64 w-full" />;

	const W = LABEL_W + months.length * STEP;
	const H = HEADER_H + rows.length * STEP;
	return (
		<div className="flex flex-col gap-2">
			<div className="overflow-x-auto">
				<svg
					viewBox={`0 0 ${W} ${H}`}
					className="w-full min-w-96 max-w-2xl"
					role="img"
					aria-label="Category activity by month"
				>
					{months.map((m, i) => {
						const [y, mo] = m.split("-");
						const date = new Date(Number(y), Number(mo) - 1);
						const label = mo === "01" ? MONTH_FMT.format(date) : MONTH_SHORT.format(date);
						return (
							<text
								key={m}
								x={LABEL_W + i * STEP + CELL / 2}
								y={HEADER_H - 8}
								textAnchor="middle"
								className="fill-muted-foreground text-[9px]"
							>
								{label}
							</text>
						);
					})}
					{rows.map((c, ri) => {
						const y = HEADER_H + ri * STEP;
						return (
							<g key={c}>
								<text
									x={LABEL_W - 10}
									y={y + CELL / 2}
									textAnchor="end"
									dominantBaseline="middle"
									className="fill-muted-foreground text-[11px]"
								>
									{c.length > 16 ? `${c.slice(0, 15)}…` : c}
								</text>
								{months.map((m, ci) => {
									const n = countOf.get(`${c}|${m}`) ?? 0;
									const alpha = n === 0 ? 0.07 : 0.2 + 0.8 * (n / max);
									return (
										<rect
											key={m}
											x={LABEL_W + ci * STEP}
											y={y}
											width={CELL}
											height={CELL}
											rx={4}
											className="fill-orange-600"
											style={{ opacity: alpha }}
										>
											<title>{`${c} · ${m}: ${n} plugin${n === 1 ? "" : "s"}`}</title>
										</rect>
									);
								})}
							</g>
						);
					})}
				</svg>
			</div>
			<div className="flex items-center gap-1.5 pl-35 text-muted-foreground text-xs">
				<span>Less</span>
				{[0.2, 0.4, 0.6, 0.8, 1].map((a) => (
					<span key={a} className="size-3 rounded-[3px] bg-orange-600" style={{ opacity: a }} />
				))}
				<span>More</span>
			</div>
		</div>
	);
}

function CategoriesPage() {
	const [metric, setMetric] = useState("count");
	const categories = useCategories();
	const heatmap = useHeatmap();
	useErrorToast(
		categories.isError,
		categories.error instanceof Error ? categories.error.message : String(categories.error),
	);
	useErrorToast(heatmap.isError, heatmap.error instanceof Error ? heatmap.error.message : String(heatmap.error));

	const m = METRICS.find((x) => x.value === metric) ?? METRICS[0];
	const chartRows = (categories.data?.rows ?? []).slice(0, 15).map((r) => ({
		name: r.category ?? "(none)",
		value: m.get(r) ?? 0,
	}));

	return (
		<div className="flex flex-col gap-8">
			<h1 className="font-heading text-2xl">Categories</h1>

			<div className="flex flex-col gap-4">
				<Tabs value={metric} onValueChange={setMetric}>
					<TabsList>
						{METRICS.map((x) => (
							<TabsTab key={x.value} value={x.value}>
								{x.label}
							</TabsTab>
						))}
					</TabsList>
				</Tabs>
				{categories.isLoading ? (
					<Skeleton className="h-64 w-full" />
				) : (
					<BarChart
						data={chartRows}
						config={{ value: { label: m.label, color: m.color } }}
						bloom="low"
						margins={{ bottom: 72 }}
						className="h-72 w-full"
					>
						<XAxis dataKey="name" angle={-45} maxTicks={chartRows.length} />
						<YAxis />
						<ChartTooltip labelKey="name" valueFormatter={(v) => m.fmt(v)} />
						<Bar dataKey="value" variant="gradient" />
					</BarChart>
				)}
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Activity by month</h2>
				<Heatmap points={heatmap.data?.points ?? []} />
			</div>
		</div>
	);
}
