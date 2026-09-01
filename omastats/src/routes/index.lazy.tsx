/** @jsxImportSource react */
import { useMemo, useState } from "react";

import type { UseQueryResult } from "@tanstack/react-query";
import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import type { DitherColor } from "@/components/dither-kit/palette";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { StatCard } from "@/components/stat-card";
import { TrendingTable } from "@/components/trending-table";

import type { StatsResponse } from "@/lib/api-types";
import { fmt, fmtDateTime, fmtRelative, pct } from "@/lib/format";
import {
	type Granularity,
	useBreakdown,
	useErrorToast,
	useHealth,
	usePublishedStats,
	useRecentPlugins,
	useTrending,
	useUpdatedStats,
	useVerifiedStats,
} from "@/lib/queries";

export const Route = createLazyFileRoute("/")({
	component: OverviewPage,
});

const SKELETON = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

const RANGES = [
	{ label: "30d", value: "30d" },
	{ label: "90d", value: "90d" },
	{ label: "365d", value: "365d" },
	{ label: "All", value: "all" },
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Short x-axis label for a `YYYY-MM-DD` / `YYYY-MM` / `YYYY` bucket. */
function fmtBucketTick(groupBy: Granularity) {
	return (value: unknown) => {
		const [y, m, d] = String(value).split("-").map(Number);
		if (!y) return String(value);
		if (groupBy === "year") return String(y);
		return m ? `${MONTHS[m - 1] ?? ""} ${d || String(y).slice(2)}` : String(value);
	};
}

function TrendChart({
	title,
	color,
	query,
	groupBy,
}: {
	title: string;
	color: DitherColor;
	query: UseQueryResult<StatsResponse, Error>;
	groupBy: Granularity;
}) {
	const { data, isLoading, isError, error } = query;
	useErrorToast(isError, error instanceof Error ? error.message : String(error));
	// Stable identity across renders (and across sibling queries settling): a
	// fresh array here would bump the chart's revision and replay the entrance
	// mid-flight every time the page re-renders.
	const rows = useMemo(
		() => (data?.points ?? []).map((p) => ({ bucket: p.bucket, count: p.count })),
		[data],
	);
	return (
		<div className="flex flex-col gap-2">
			<h2 className="font-medium text-muted-foreground text-sm">{title}</h2>
			{isLoading ? (
				<div className="h-56 animate-pulse rounded-lg bg-muted" />
			) : (
				<AreaChart data={rows} config={{ count: { label: title, color } }} bloom="low" className="h-56 w-full">
					<XAxis dataKey="bucket" tickFormatter={fmtBucketTick(groupBy)} maxTicks={4} />
					<YAxis />
					<ChartTooltip labelKey="bucket" />
					<Area dataKey="count" variant="gradient" />
				</AreaChart>
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
	const trending = useTrending(7);
	const recent = useRecentPlugins(8);

	useErrorToast(health.isError, health.error instanceof Error ? health.error.message : String(health.error));
	useErrorToast(trending.isError, trending.error instanceof Error ? trending.error.message : String(trending.error));
	useErrorToast(recent.isError, recent.error instanceof Error ? recent.error.message : String(recent.error));
	useErrorToast(
		breakdown.isError,
		breakdown.error instanceof Error ? breakdown.error.message : String(breakdown.error),
	);

	const weekCount = (publishedWeek.data?.points ?? []).reduce((a, p) => a + p.count, 0);
	const custom = Boolean(customFrom || customTo);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-heading text-2xl">Overview</h1>
					<p className="text-muted-foreground text-sm">
						Last snapshot {fmtRelative(health.data?.lastSnapshotAt ?? null)}
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
									size="sm"
									className="text-muted-foreground transition-colors hover:text-foreground"
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

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					label="Total plugins"
					value={health.data?.pluginCount ?? null}
					loading={health.isLoading}
					footnote={`Last snapshot: ${fmtDateTime(health.data?.lastSnapshotAt ?? null)}`}
				/>
				<StatCard
					label="Verified"
					value={breakdown.data ? `${pct(breakdown.data.verifiedCount, breakdown.data.totalPlugins)}%` : null}
					loading={breakdown.isLoading}
					footnote={`${fmt(breakdown.data?.verifiedCount ?? null)} of ${fmt(breakdown.data?.totalPlugins ?? null)} plugins`}
				/>
				<StatCard
					label="Published this week"
					value={publishedWeek.isLoading ? null : weekCount}
					loading={publishedWeek.isLoading}
					footnote="Plugins added to the catalog in the last 7 days"
				/>
				<StatCard
					label="Snapshots stored"
					value={health.data?.snapshotCount ?? null}
					loading={health.isLoading}
				/>
			</div>

			<div className="grid gap-8 lg:grid-cols-3">
				<TrendChart title="Published" color="orange" query={published} groupBy={groupBy} />
				<TrendChart title="Verified" color="green" query={verified} groupBy={groupBy} />
				<TrendChart title="Updated" color="blue" query={updated} groupBy={groupBy} />
			</div>

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
						{recent.isLoading
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
