/** @jsxImportSource react */
import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BlockLegend } from "@/components/dither-kit/block-legend";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Pie } from "@/components/dither-kit/pie";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import type { DitherColor } from "@/components/dither-kit/palette";

import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { BrokenPluginsTable } from "@/components/broken-plugins-table";
import { useBreakdown, useBrokenPlugins, useErrorToast } from "@/lib/queries";
import { fmt } from "@/lib/format";

export const Route = createLazyFileRoute("/health")({
	component: HealthPage,
});

const STATUS_COLORS: Record<string, string> = {
	verified: "green",
	unverified: "red",
	Available: "green",
	"Manual setup": "orange",
};

function statusColor(status: string | null): DitherColor {
	if (!status) return "grey";
	return (STATUS_COLORS[status] as DitherColor | undefined) ?? "grey";
}

function Donut({
	title,
	rows,
	loading,
}: {
	title: string;
	rows: { status: string | null; count: number }[] | undefined;
	loading: boolean;
}) {
	// Stable across renders: the pie entrance replays whenever the data array
	// identity changes, and these maps would otherwise make fresh arrays on
	// every re-render of the page (the two queries here settle at different
	// ticks).
	const data = useMemo(
		() => (rows ?? []).map((r) => ({ name: r.status ?? "unknown", value: r.count })),
		[rows],
	);
	const config = useMemo(
		() => Object.fromEntries(data.map((d) => [d.name, { label: d.name, color: statusColor(d.name) }])),
		[data],
	);
	const total = data.reduce((a, d) => a + d.value, 0);
	return (
		<div className="flex flex-col gap-2">
			<h2 className="text-center font-medium text-muted-foreground text-sm">
				{title} <span className="font-mono tabular-nums">({fmt(total)})</span>
			</h2>
			{loading ? (
				<Skeleton className="h-56 w-full" />
			) : data.length === 0 ? (
				<Empty>
					<EmptyTitle>No data</EmptyTitle>
				</Empty>
			) : (
				<>
					<PieChart
						data={data}
						config={config}
						dataKey="value"
						nameKey="name"
						innerRadius={0.5}
						bloom="low"
						className="h-56 w-full"
					>
						<ChartTooltip />
						<Pie variant="gradient" />
					</PieChart>
					<BlockLegend
						config={config}
						values={Object.fromEntries(data.map((d) => [d.name, d.value]))}
						valueFormatter={(v) => fmt(v)}
						align="center"
					/>
				</>
			)}
		</div>
	);
}

function HealthPage() {
	const breakdown = useBreakdown();
	const broken = useBrokenPlugins();
	useErrorToast(
		breakdown.isError,
		breakdown.error instanceof Error ? breakdown.error.message : String(breakdown.error),
	);
	useErrorToast(broken.isError, broken.error instanceof Error ? broken.error.message : String(broken.error));

	return (
		<div className="flex flex-col gap-8">
			<h1 className="font-heading text-2xl">Ecosystem Health</h1>

			<div className="grid gap-8 lg:grid-cols-2">
				<Donut title="Verification status" rows={breakdown.data?.verification} loading={breakdown.isLoading} />
				<Donut
					title="Install availability"
					rows={breakdown.data?.installStatus}
					loading={breakdown.isLoading}
				/>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Broken plugins</h2>
				<p className="text-muted-foreground text-sm">
					Unreachable/failed upstream, or repository untouched for &gt;{broken.data?.staleDays ?? 365} days
				</p>
				<BrokenPluginsTable plugins={broken.data?.plugins ?? []} loading={broken.isLoading} />
			</div>
		</div>
	);
}
