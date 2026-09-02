/** @jsxImportSource react */

import type { UseQueryResult } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { GraphPlot } from "@/components/graph-plot";
import { GraphStatSkeleton } from "@/components/graph-skeleton";
import { GraphStat } from "@/components/graph-stat";
import { TrendingTable } from "@/components/trending-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

import type { ChartSeriesResponse, StatsResponse } from "@/lib/api-types";
import { fmt, fmtMonthDay, fmtRelative, pct } from "@/lib/format";
import { useSkeletonDelay } from "@/lib/loading";
import {
	type Granularity,
	useBreakdown,
	useErrorToast,
	useHealth,
	usePublishedStats,
	useRecentPlugins,
	useTotalStats,
	useTrending,
	useUpdatedStats,
	useVerifiedStats,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Omachi · Analytics for the Omarchy plugin catalog" },
			{
				name: "description",
				content:
					"An independent companion dashboard for the Omarchy plugin catalog: hearts, views, copies, leaderboards, ecosystem health, categories, and embeddable badges.",
			},
		],
	}),
	component: OverviewPage,
});

const SKELETON = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

const RANGES = [
	{ label: "30d", value: "30d" },
	{ label: "90d", value: "90d" },
	{ label: "365d", value: "365d" },
	{ label: "All", value: "all" },
] as const;

function TrendChart({
	title,
	query,
}: {
	title: string;
	query: UseQueryResult<StatsResponse | ChartSeriesResponse, Error>;
}) {
	const { data, isLoading, isError, error } = query;
	useErrorToast(isError, error instanceof Error ? error.message : String(error));
	// Skeleton only after the grace period; inside it the real frame renders
	// with empty data, so fast loads just see the chart fill in.
	const showSkeleton = useSkeletonDelay(isLoading);
	// Keep the series identity stable while sibling queries settle so the graph
	// entrance does not replay on every page render.
	const points = useMemo(() => data?.points ?? [], [data]);
	const values = useMemo(() => points.map((point) => point.count), [points]);
	const labels = useMemo(
		() => points.map((point) => fmtMonthDay("bucket" in point ? point.bucket : point.date)),
		[points],
	);
	return (
		<div className="flex min-w-0 flex-col gap-2">
			{showSkeleton ? (
				<Skeleton className="h-56 w-full" />
			) : (
				<GraphPlot title={title} data={values} labels={labels} className="w-full" />
			)}
		</div>
	);
}

function OverviewPage() {
	// ponytail: default "day" because the catalog only has ~1 day of stats yet;
	// switch to "month" once there's enough history to be useful.
	const [groupBy, setGroupBy] = useState<Granularity>("day");
	const [range, setRange] = useState<string>("90d");
	const [customFrom, setCustomFrom] = useState<string | undefined>();
	const [customTo, setCustomTo] = useState<string | undefined>();

	const health = useHealth();
	const breakdown = useBreakdown();
	const publishedWeek = usePublishedStats("7d", "day");
	const published = usePublishedStats(range, groupBy, customFrom, customTo);
	const verified = useVerifiedStats(range, groupBy, customFrom, customTo);
	const updated = useUpdatedStats(range, groupBy, customFrom, customTo);
	const total = useTotalStats(groupBy);
	const trending = useTrending(7);
	const recent = useRecentPlugins(8);

	useErrorToast(health.isError, health.error instanceof Error ? health.error.message : String(health.error));
	useErrorToast(total.isError, total.error instanceof Error ? total.error.message : String(total.error));
	useErrorToast(trending.isError, trending.error instanceof Error ? trending.error.message : String(trending.error));
	useErrorToast(recent.isError, recent.error instanceof Error ? recent.error.message : String(recent.error));
	useErrorToast(
		breakdown.isError,
		breakdown.error instanceof Error ? breakdown.error.message : String(breakdown.error),
	);

	const weekCount = (publishedWeek.data?.points ?? []).reduce((a, p) => a + p.count, 0);
	const showRecentSkeleton = useSkeletonDelay(recent.isLoading);
	const showStatSkeleton = useSkeletonDelay(health.isLoading || breakdown.isLoading || publishedWeek.isLoading);
	const custom = Boolean(customFrom || customTo);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-wrap items-baseline gap-x-3">
					<h1 className="font-heading text-2xl">Overview</h1>
					<p className="text-muted-foreground text-xs">
						last snapshot {fmtRelative(health.data?.lastSnapshotAt ?? null)}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as Granularity)}>
						<TabsList size="sm">
							<TabsTab value="day">Day</TabsTab>
							<TabsTab value="month">Month</TabsTab>
							<TabsTab value="year">Year</TabsTab>
						</TabsList>
					</Tabs>
					<span className="h-5 w-px bg-border" aria-hidden="true" />
					<Tabs
						value={range}
						onValueChange={(v) => {
							setRange(v);
							setCustomFrom(undefined);
							setCustomTo(undefined);
						}}
					>
						<TabsList size="sm">
							{RANGES.map((r) => (
								<TabsTab key={r.value} value={r.value}>
									{r.label}
								</TabsTab>
							))}
						</TabsList>
					</Tabs>
					<Popover>
						<PopoverTrigger
							render={
								<Button
									variant={custom ? "secondary" : "ghost"}
									size="default"
									// Default height matches the sm tabs list's outer
									// height (h-6.5 items + p-0.5 list padding).
									className="graph-frame font-mono tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
								>
									Custom
								</Button>
							}
						/>
						<PopoverPopup align="end">
							<Calendar
								mode="range"
								selected={
									customFrom && customTo
										? { from: new Date(customFrom), to: new Date(customTo) }
										: undefined
								}
								onSelect={(r) => {
									setCustomFrom(r?.from ? r.from.toISOString().slice(0, 10) : undefined);
									setCustomTo(r?.to ? r.to.toISOString().slice(0, 10) : undefined);
								}}
							/>
							{custom && (
								<Button
									variant="ghost"
									size="sm"
									className="mt-2 w-full"
									onClick={() => {
										setCustomFrom(undefined);
										setCustomTo(undefined);
									}}
								>
									Clear dates
								</Button>
							)}
						</PopoverPopup>
					</Popover>
				</div>
			</div>

			{showStatSkeleton ? (
				<GraphStatSkeleton title="Catalog" items={4} />
			) : (
				<GraphStat
					title="Catalog"
					items={[
						{ accent: true, value: fmt(health.data?.pluginCount ?? null), label: "total plugins" },
						{
							value: breakdown.data
								? `${pct(breakdown.data.verifiedCount, breakdown.data.totalPlugins)}%`
								: "—",
							label: "verified",
						},
						{ value: publishedWeek.isLoading ? "—" : fmt(weekCount), label: "published this week" },
						{ value: fmt(health.data?.snapshotCount ?? null), label: "snapshots stored" },
					]}
				/>
			)}

			<TrendChart title="Total" query={total} />

			<div className="grid gap-8 md:grid-cols-3">
				<TrendChart title="Published" query={published} />
				<TrendChart title="Verified" query={verified} />
				<TrendChart title="Updated" query={updated} />
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between">
					<h2 className="font-heading text-xl">Recent plugins</h2>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Plugin</TableHead>
							<TableHead>Author</TableHead>
							<TableHead>Category</TableHead>
							<TableHead className="text-right">Added</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{showRecentSkeleton
							? SKELETON.slice(0, 4).map((k) => (
									<TableRow key={k}>
										<TableCell colSpan={4}>
											<Skeleton className="h-5 w-full" />
										</TableCell>
									</TableRow>
								))
							: (recent.data?.plugins ?? []).map((p) => (
									<TableRow key={p.id}>
										<TableCell>
											<Link
												to="/plugins/$pluginId"
												params={{ pluginId: p.id }}
												title={p.name ?? p.id}
												className="block max-w-72 truncate font-medium hover:underline"
											>
												{p.name ?? p.id}
											</Link>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{p.author ? (
												<Link
													to="/authors/$authorId"
													params={{ authorId: p.author }}
													title={p.author}
													className="block max-w-40 truncate hover:underline"
												>
													{p.author}
												</Link>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{fmtRelative(p.addedAt)}
										</TableCell>
									</TableRow>
								))}
					</TableBody>
				</Table>
			</div>

			<GraphRule />

			<section className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between">
					<h2 className="font-heading text-xl">Trending this week</h2>
					<Link
						to="/leaderboards"
						search={{ tab: "trending" }}
						className="text-muted-foreground text-sm hover:underline"
					>
						View all
					</Link>
				</div>
				<TrendingTable top={trending.data?.top ?? []} loading={trending.isLoading} />
			</section>
		</div>
	);
}
