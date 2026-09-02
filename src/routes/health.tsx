/** @jsxImportSource react */

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { BrokenPluginsTable } from "@/components/broken-plugins-table";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { GraphRank } from "@/components/graph-rank";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { UnverifiedPluginsTable } from "@/components/unverified-plugins-table";

import { breakdownQuery, brokenPluginsQuery, unverifiedPluginsQuery } from "@/lib/queries";

const RANGES = [
	{ value: "7d", label: "7d" },
	{ value: "14d", label: "14d" },
	{ value: "30d", label: "1 month" },
] as const;
const DEFAULTS = { range: "30d" } as const;

// Zod v4 schema passed straight to validateSearch; `.catch` coerces garbage
// to the default instead of erroring the route.
const healthSearchSchema = z.object({
	range: z
		.enum(["7d", "14d", "30d"])
		.default(DEFAULTS.range)
		.catch(DEFAULTS.range),
});

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
	validateSearch: healthSearchSchema,
	search: { middlewares: [stripSearchParams(DEFAULTS)] },
	loaderDeps: ({ search: { range } }) => ({ range }),
	loader: ({ deps, context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(breakdownQuery()),
			queryClient.ensureQueryData(brokenPluginsQuery()),
			queryClient.ensureQueryData(unverifiedPluginsQuery(deps.range)),
		]),
	component: HealthPage,
});

function StatusChart({ title, rows }: { title: string; rows: { status: string | null; count: number }[] | undefined }) {
	const items = useMemo(
		() =>
			(rows ?? [])
				.map((row) => ({ label: row.status ?? "unknown", value: row.count }))
				.sort((left, right) => right.value - left.value),
		[rows],
	);
	if (items.length > 0) {
		return <GraphRank title={title} items={items} className="w-full" />;
	}
	return (
		<Empty>
			<EmptyTitle>No data</EmptyTitle>
		</Empty>
	);
}

function HealthPage() {
	const { range } = Route.useSearch();
	const navigate = useNavigate({ from: "/health" });
	const { data: breakdown } = useSuspenseQuery(breakdownQuery());
	const { data: broken } = useSuspenseQuery(brokenPluginsQuery());
	const { data: unverified } = useSuspenseQuery(unverifiedPluginsQuery(range));

	return (
		<div className="flex flex-col gap-8">
			<h1 className="font-heading text-2xl">Ecosystem Health</h1>

			<div className="flex flex-col gap-12">
				<StatusChart title="INSTALL AVAILABILITY" rows={breakdown.installStatus} />
				<StatusChart title="VERIFICATION STATUS" rows={breakdown.verification} />
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Broken plugins</h2>
				<p className="text-muted-foreground text-sm">
					Unreachable/failed upstream, or repository untouched for &gt;{broken.staleDays} days
				</p>
				<BrokenPluginsTable plugins={broken.plugins} />
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="font-heading text-xl">Unverified plugins</h2>
					<Tabs
						value={range}
						onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, range: v as typeof range }) })}
					>
						<TabsList>
							{RANGES.map((r) => (
								<TabsTab key={r.value} value={r.value}>
									{r.label}
								</TabsTab>
							))}
						</TabsList>
					</Tabs>
				</div>
				<UnverifiedPluginsTable plugins={unverified.plugins} />
			</div>
		</div>
	);
}
