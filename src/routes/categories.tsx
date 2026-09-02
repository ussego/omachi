/** @jsxImportSource react */

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GraphHeatmap } from "@/components/graph-heatmap";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { GraphRank } from "@/components/graph-rank";
import { GraphRankSkeleton } from "@/components/graph-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

import type { CategoriesResponse } from "@/lib/api-types";
import { useSkeletonDelay } from "@/lib/loading";

import { useCategories, useErrorToast, useHeatmap } from "@/lib/queries";

export const Route = createFileRoute("/categories")({
	head: () => ({
		meta: [
			{ title: "Categories · Omachi" },
			{
				name: "description",
				content:
					"Plugin counts and engagement by category for the Omarchy catalog, with a monthly activity heatmap.",
			},
		],
	}),
	component: CategoriesPage,
});

type CategoryRow = CategoriesResponse["rows"][number];

const METRICS: {
	value: string;
	label: string;

	get: (r: CategoryRow) => number | null;
}[] = [
	{ value: "count", label: "Plugin count", get: (r) => r.count },
	{ value: "avgHearts", label: "Avg hearts", get: (r) => r.avgHearts },
	{ value: "avgViews", label: "Avg views", get: (r) => r.avgViews },
	{
		value: "avgCopies",
		label: "Avg copies",
		get: (r) => r.avgCopies,
	},
];

const MONTH_FMT = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });
const MONTH_SHORT = new Intl.DateTimeFormat(undefined, { month: "short" });

function Heatmap({
	points,
	loading,
}: {
	points: { category: string | null; month: string; count: number }[];
	loading: boolean;
}) {
	const { rows, columns, max } = useMemo(() => {
		const totals = new Map<string, number>();
		for (const point of points) {
			const category = point.category ?? "(none)";
			totals.set(category, (totals.get(category) ?? 0) + point.count);
		}
		const rows = [...totals.entries()]
			.sort(([, left], [, right]) => right - left)
			.slice(0, 15)
			.map(([label]) => label);
		const months = [...new Set(points.map((point) => point.month))].sort();
		const countOf = new Map(points.map((point) => [`${point.category ?? "(none)"}|${point.month}`, point.count]));
		const columns = months.map((month) => {
			const [year, monthNumber] = month.split("-");
			const date = new Date(Number(year), Number(monthNumber) - 1);
			return monthNumber === "01" ? MONTH_FMT.format(date) : MONTH_SHORT.format(date);
		});
		return {
			rows: rows.map((label) => ({
				label,
				values: months.map((month) => countOf.get(`${label}|${month}`) ?? 0),
			})),
			columns,
			max: Math.max(1, ...points.map((point) => point.count)),
		};
	}, [points]);

	// Skeleton only after the grace period; inside it the real heatmap frame
	// renders empty so the layout stays put when the grid fades in.
	const showSkeleton = useSkeletonDelay(loading);

	if (showSkeleton) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-6 w-full" />
				<Skeleton className="h-[26rem] w-full" />
			</div>
		);
	}
	if (loading) {
		// Still within the grace period: keep the warm frame with an empty grid.
		return <GraphHeatmap title="ACTIVITY" columns={[]} rows={[]} max={1} className="w-full" />;
	}
	if (rows.length === 0 || columns.length === 0) {
		return <p className="py-8 text-center text-muted-foreground text-sm">No activity yet.</p>;
	}
	return <GraphHeatmap title="ACTIVITY" columns={columns} rows={rows} max={max} className="w-full" />;
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
	const showSkeleton = useSkeletonDelay(categories.isLoading);
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
				{showSkeleton ? (
					<GraphRankSkeleton title="CATEGORIES" rows={15} />
				) : (
					<GraphRank
						title="CATEGORIES"
						items={chartRows.map((row) => ({ label: row.name, value: row.value }))}
						className="w-full"
					/>
				)}
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Activity by month</h2>
				<Heatmap points={heatmap.data?.points ?? []} loading={heatmap.isLoading} />
			</div>
		</div>
	);
}
