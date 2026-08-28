/** @jsxImportSource react */
import { useMemo, useState } from "react";

import { createLazyFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

import { DitherAvatar } from "@/components/dither-kit/avatar";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import type { DitherColor } from "@/components/dither-kit/palette";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { YAxis } from "@/components/dither-kit/y-axis";

import type { LeaderboardRow } from "@/lib/api-types";
import { fmt } from "@/lib/format";
import { TrendingTable } from "@/components/trending-table";
import { useAuthors, useErrorToast, useLeaderboard, useTrending } from "@/lib/queries";

const SKELETON = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

export const Route = createLazyFileRoute("/leaderboards")({
	component: LeaderboardsPage,
});

const METRIC_TABS = [
	{
		value: "hearts",
		label: "Hearts",
		color: "pink" as DitherColor,
		score: (r: LeaderboardRow) => r.hearts,
		spark: (r: LeaderboardRow) => (r.spark ?? []).map((s) => s.hearts ?? 0),
	},
	{
		value: "views",
		label: "Views",
		color: "blue" as DitherColor,
		score: (r: LeaderboardRow) => r.views,
		spark: (r: LeaderboardRow) => (r.spark ?? []).map((s) => s.views ?? 0),
	},
	{
		value: "copies",
		label: "Copies",
		color: "green" as DitherColor,
		score: (r: LeaderboardRow) => r.copies,
		spark: (r: LeaderboardRow) => (r.spark ?? []).map((s) => s.copies ?? 0),
	},
	{
		value: "copies_per_view",
		label: "Conversion",
		color: "purple" as DitherColor,
		score: (r: LeaderboardRow) => r.score,
		spark: (r: LeaderboardRow) => (r.spark ?? []).map((s) => (s.views ? (s.copies ?? 0) / s.views : 0)),
	},
] as const;

function MetricLeaderboard({ metric }: { metric: (typeof METRIC_TABS)[number] }) {
	const [limit, setLimit] = useState(25);
	const { data, isLoading, isError, error } = useLeaderboard(metric.value, limit, 10);
	useErrorToast(isError, error instanceof Error ? error.message : String(error));

	const rows = data?.rows ?? [];
	// Stable across renders: the bar entrance replays whenever the data array
	// identity changes, and this map would otherwise make a fresh array on
	// every re-render.
	const chartRows = useMemo(
		() => rows.slice(0, 25).map((r) => ({ name: r.name ?? r.pluginId, value: metric.score(r) ?? 0 })),
		[rows, metric],
	);

	return (
		<div className="flex flex-col gap-6">
			{isLoading ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<BarChart
					data={chartRows}
					config={{ value: { label: metric.label, color: metric.color } }}
					bloom="low"
					className="h-64 w-full"
				>
					<YAxis />
					<ChartTooltip labelKey="name" />
					<Bar dataKey="value" variant="gradient" />
				</BarChart>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-14">#</TableHead>
						<TableHead>Plugin</TableHead>
						<TableHead>Author</TableHead>
						<TableHead className="text-right">Value</TableHead>
						<TableHead className="w-28">Trend</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((r, i) => (
						<TableRow key={r.pluginId}>
							<TableCell className="font-mono tabular-nums">{i + 1}</TableCell>
							<TableCell>
								<Link
									to="/plugins/$pluginId"
									params={{ pluginId: r.pluginId }}
									title={r.name ?? r.pluginId}
									className="block max-w-64 truncate font-medium hover:underline"
								>
									{r.name ?? r.pluginId}
								</Link>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{r.author ? (
									<Link
										to="/authors/$authorId"
										params={{ authorId: r.author }}
										className="hover:underline"
									>
										{r.author}
									</Link>
								) : (
									"—"
								)}
							</TableCell>
							<TableCell className="text-right font-mono tabular-nums">{fmt(metric.score(r))}</TableCell>
							<TableCell>
								{(r.spark?.length ?? 0) > 1 ? (
									<Sparkline data={metric.spark(r)} color={metric.color} className="h-6 w-24" />
								) : (
									<span className="text-muted-foreground text-xs">—</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex items-center justify-end gap-1">
				{[25, 50, 100].map((n) => (
					<Button key={n} variant={limit === n ? "secondary" : "ghost"} size="sm" onClick={() => setLimit(n)}>
						Top {n}
					</Button>
				))}
			</div>
		</div>
	);
}

function TrendingLeaderboard() {
	const [days, setDays] = useState<7 | 30>(7);
	const { data, isLoading, isError, error } = useTrending(days);
	useErrorToast(isError, error instanceof Error ? error.message : String(error));

	return (
		<div className="flex flex-col gap-6">
			<Tabs value={String(days)} onValueChange={(v) => setDays(v === "30" ? 30 : 7)}>
				<TabsList>
					<TabsTab value="7">7 days</TabsTab>
					<TabsTab value="30">30 days</TabsTab>
				</TabsList>
			</Tabs>
			<TrendingTable top={data?.top ?? []} loading={isLoading} limit={10} />
		</div>
	);
}

function AuthorsLeaderboard() {
	const [limit, setLimit] = useState(25);
	const { data, isLoading, isError, error } = useAuthors();
	useErrorToast(isError, error instanceof Error ? error.message : String(error));

	const rows = (data?.rows ?? []).slice(0, limit);

	return (
		<div className="flex flex-col gap-6">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-14">#</TableHead>
						<TableHead>Author</TableHead>
						<TableHead className="text-right">Plugins</TableHead>
						<TableHead className="text-right">Hearts</TableHead>
						<TableHead className="text-right">Views</TableHead>
						<TableHead className="text-right">Copies</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading
						? SKELETON.slice(0, 8).map((k) => (
								<TableRow key={k}>
									<TableCell colSpan={6}>
										<Skeleton className="h-5 w-full" />
									</TableCell>
								</TableRow>
							))
						: rows.map((r, i) => (
								<TableRow key={r.author}>
									<TableCell className="font-mono tabular-nums">{i + 1}</TableCell>
									<TableCell className="font-medium">
										<Link
											to="/authors/$authorId"
											params={{ authorId: r.author ?? "" }}
											className="flex items-center gap-3 hover:underline"
										>
											<DitherAvatar
												name={r.author ?? ""}
												className="size-5 shrink-0"
												animate={false}
											/>
											{r.author}
										</Link>
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										{fmt(r.plugins)}
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">{fmt(r.hearts)}</TableCell>
									<TableCell className="text-right font-mono tabular-nums">{fmt(r.views)}</TableCell>
									<TableCell className="text-right font-mono tabular-nums">{fmt(r.copies)}</TableCell>
								</TableRow>
							))}
				</TableBody>
			</Table>
			<div className="flex items-center justify-end gap-1">
				{[25, 50, 100].map((n) => (
					<Button key={n} variant={limit === n ? "secondary" : "ghost"} size="sm" onClick={() => setLimit(n)}>
						Top {n}
					</Button>
				))}
			</div>
		</div>
	);
}

function LeaderboardsPage() {
	const { tab: tabParam } = useSearch({ from: "/leaderboards" });
	const tab = tabParam ?? "hearts";
	const navigate = useNavigate({ from: "/leaderboards" });
	const metric = METRIC_TABS.find((m) => m.value === tab);
	const changeTab = (value: string) => {
		navigate({ search: { tab: value } });
	};
	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-heading text-2xl">Leaderboards</h1>
			<Tabs value={tab} onValueChange={changeTab}>
				<TabsList variant="underline">
					{METRIC_TABS.map((m) => (
						<TabsTab key={m.value} value={m.value}>
							{m.label}
						</TabsTab>
					))}
					<TabsTab value="trending">Trending</TabsTab>
					<TabsTab value="authors">Authors</TabsTab>
				</TabsList>
			</Tabs>
			{metric ? (
				<MetricLeaderboard metric={metric} />
			) : tab === "trending" ? (
				<TrendingLeaderboard />
			) : (
				<AuthorsLeaderboard />
			)}
		</div>
	);
}
