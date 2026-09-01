/** @jsxImportSource react */

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrokenPluginsTable } from "@/components/broken-plugins-table";
import { GraphStack } from "@/components/graph-stack";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { UnverifiedPluginsTable } from "@/components/unverified-plugins-table";

import { fmt } from "@/lib/format";
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

function StatusBreakdown({
	title,
	rows,
	loading,
}: {
	title: string;
	rows: { status: string | null; count: number }[] | undefined;
	loading: boolean;
}) {
	const data = useMemo(
		() => (rows ?? []).map((row) => ({ label: row.status ?? "unknown", value: row.count })),
		[rows],
	);
	const total = data.reduce((sum, row) => sum + row.value, 0);
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
				<GraphStack
					title="BREAKDOWN"
					rows={[{ label: "plugins", segments: data }]}
					palette="multi"
					className="w-full"
				/>
			)}
		</div>
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

			<div className="grid gap-8 lg:grid-cols-2">
				<StatusBreakdown
					title="Verification status"
					rows={breakdown.data?.verification}
					loading={breakdown.isLoading}
				/>
				<StatusBreakdown
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
