/** @jsxImportSource react */

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrokenPluginsTable } from "@/components/broken-plugins-table";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { GraphRank } from "@/components/graph-rank";
import { GraphRankSkeleton } from "@/components/graph-skeleton";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { UnverifiedPluginsTable } from "@/components/unverified-plugins-table";

import { useSkeletonDelay } from "@/lib/loading";
import { useBreakdown, useBrokenPlugins, useErrorToast, useUnverifiedPlugins } from "@/lib/queries";

export const Route = createFileRoute("/health")({
	head: () => ({
		meta: [
			{ title: "Ecosystem Health · Omachi" },
			{
				name: "description",
				content:
					"Verification status, install availability, and broken plugins across the Omarchy plugin catalog.",
			},
		],
	}),
	component: HealthPage,
});

function StatusChart({
	title,
	rows,
	loading,
	skeletonRows = 4,
}: {
	title: string;
	rows: { status: string | null; count: number }[] | undefined;
	loading: boolean;
	skeletonRows?: number;
}) {
	const items = useMemo(
		() =>
			(rows ?? [])
				.map((row) => ({ label: row.status ?? "unknown", value: row.count }))
				.sort((left, right) => right.value - left.value),
		[rows],
	);
	// Skeleton only after the grace period; inside it the real frame renders
	// with empty rows so fast loads never flash a placeholder.
	const showSkeleton = useSkeletonDelay(loading);
	if (showSkeleton) {
		return <GraphRankSkeleton title={title} rows={skeletonRows} className="w-full" />;
	}
	if (loading || items.length > 0) {
		return <GraphRank title={title} items={items} className="w-full" />;
	}
	return (
		<Empty>
			<EmptyTitle>No data</EmptyTitle>
		</Empty>
	);
}

function HealthPage() {
	const [range, setRange] = useState("30d");
	const breakdown = useBreakdown();
	const broken = useBrokenPlugins();
	const unverified = useUnverifiedPlugins(range);
	useErrorToast(
		breakdown.isError,
		breakdown.error instanceof Error ? breakdown.error.message : String(breakdown.error),
	);
	useErrorToast(broken.isError, broken.error instanceof Error ? broken.error.message : String(broken.error));
	useErrorToast(
		unverified.isError,
		unverified.error instanceof Error ? unverified.error.message : String(unverified.error),
	);

	return (
		<div className="flex flex-col gap-8">
			<h1 className="font-heading text-2xl">Ecosystem Health</h1>

			<div className="flex flex-col gap-12">
				<StatusChart
					title="INSTALL AVAILABILITY"
					rows={breakdown.data?.installStatus}
					loading={breakdown.isLoading}
					skeletonRows={5}
				/>
				<StatusChart
					title="VERIFICATION STATUS"
					rows={breakdown.data?.verification}
					loading={breakdown.isLoading}
				/>
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Broken plugins</h2>
				<p className="text-muted-foreground text-sm">
					Unreachable/failed upstream, or repository untouched for &gt;{broken.data?.staleDays ?? 365} days
				</p>
				<BrokenPluginsTable plugins={broken.data?.plugins ?? []} loading={broken.isLoading} />
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="font-heading text-xl">Unverified plugins</h2>
					<Tabs value={range} onValueChange={setRange}>
						<TabsList>
							<TabsTab value="7d">7d</TabsTab>
							<TabsTab value="14d">14d</TabsTab>
							<TabsTab value="30d">1 month</TabsTab>
						</TabsList>
					</Tabs>
				</div>
				<UnverifiedPluginsTable plugins={unverified.data?.plugins ?? []} loading={unverified.isLoading} />
			</div>
		</div>
	);
}
