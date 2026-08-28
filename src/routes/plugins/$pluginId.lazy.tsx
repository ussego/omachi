/** @jsxImportSource react */

import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";

import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { DitherButton } from "@/components/dither-kit/button";
import { Legend } from "@/components/dither-kit/legend";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { StatCard } from "@/components/stat-card";

import { fmt, fmtDate, fmtDateTime, fmtMonthDay } from "@/lib/format";
import { useErrorToast, useLeaderboard, usePluginDetail } from "@/lib/queries";

export const Route = createLazyFileRoute("/plugins/$pluginId")({
	component: PluginDetailPage,
});

function verificationVariant(status: string | null): "success" | "warning" | "secondary" {
	if (status === "verified") return "success";
	if (status === "unverified") return "warning";
	return "secondary";
}

function statusVariant(status: string | null): "success" | "warning" | "secondary" {
	if (status === "Available") return "success";
	if (status === "Manual setup") return "warning";
	return "secondary";
}

function PluginDetailPage() {
	const { pluginId } = useParams({ from: "/plugins/$pluginId" });
	const { data, isLoading, isError, error } = usePluginDetail(pluginId);

	// Clamp the description to 3 lines; show the toggle only while the text is
	// actually clipped (the clamp threshold varies with width, so measure it).
	const [descExpanded, setDescExpanded] = useState(false);
	const [descClamped, setDescClamped] = useState(false);
	const descRef = useRef<HTMLParagraphElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the description mounts — the ref is null during the loading skeleton, so the observer can't attach until data lands.
	useLayoutEffect(() => {
		const el = descRef.current;
		if (!el) return;
		const check = () => setDescClamped(el.scrollHeight > el.clientHeight + 1);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => ro.disconnect();
	}, [data?.plugin.description]);

	useErrorToast(isError, error instanceof Error ? error.message : String(error));
	useEffect(() => {
		if (data?.plugin.name) document.title = `${data.plugin.name} · omastats`;
	}, [data]);

	const ranks = useLeaderboard("hearts", 100, 0);
	const rankOf = (id: string) => {
		const idx = (ranks.data?.rows ?? []).findIndex((r) => r.pluginId === id);
		return idx >= 0 ? idx + 1 : null;
	};

	// Stable across renders: the chart's entrance replays whenever the data
	// array identity changes, and this map would otherwise make a fresh array
	// on every re-render of the page.
	const rows = useMemo(
		() =>
			(data?.snapshots ?? []).map((s) => ({
				snapshotAt: s.snapshotAt,
				hearts: s.hearts ?? 0,
				views: s.views ?? 0,
				copies: s.copies ?? 0,
			})),
		[data],
	);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-10 w-1/2" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="flex flex-col gap-6">
				<Empty>
					<EmptyTitle>Plugin not found</EmptyTitle>
				</Empty>
			</div>
		);
	}

	const { plugin, snapshots, averages } = data;
	const last = snapshots[snapshots.length - 1];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-start gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto]">
				<div className="flex flex-col gap-2">
					<h1 className="text-balance font-heading text-2xl">{plugin.name ?? plugin.id}</h1>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						<div className="flex flex-wrap items-center gap-1.5">
							{plugin.category && <Badge variant="secondary">{plugin.category}</Badge>}
							{plugin.author && (
								<Link
									to="/authors/$authorId"
									params={{ authorId: plugin.author }}
									className="text-muted-foreground text-sm hover:underline"
								>
									by {plugin.author}
								</Link>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge
								variant={verificationVariant(last?.verificationStatus ?? null)}
								className="font-mono uppercase"
							>
								{last?.verificationStatus ?? "unknown"}
							</Badge>
							{plugin.status && (
								<Badge variant={statusVariant(plugin.status)} className="font-mono uppercase">
									{plugin.status}
								</Badge>
							)}
							{plugin.license && (
								<Badge variant="outline" className="font-mono uppercase">
									{plugin.license}
								</Badge>
							)}
						</div>
					</div>
					<p
						ref={descRef}
						className={cn(
							"max-w-2xl text-pretty text-muted-foreground text-sm",
							!descExpanded && "line-clamp-3",
						)}
					>
						{plugin.description}
					</p>
					{(descClamped || descExpanded) && (
						<button
							type="button"
							onClick={() => setDescExpanded((e) => !e)}
							aria-expanded={descExpanded}
							className="w-fit cursor-pointer text-muted-foreground text-xs underline decoration-dotted underline-offset-2 hover:text-foreground"
						>
							{descExpanded ? "Show less" : "Show more"}
						</button>
					)}
					<p className="font-mono text-muted-foreground text-xs">
						{plugin.id} · added {fmtDate(plugin.addedAt)}
					</p>
				</div>
				<div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-2 sm:text-right">
					<div className="flex flex-col">
						<span className="text-muted-foreground text-xs">Current rank (hearts)</span>
						<span className="font-mono text-2xl tabular-nums">#{rankOf(plugin.id) ?? "—"}</span>
					</div>
					<div className="flex flex-col items-end gap-2">
						<DitherButton
							render={
								<a
									href={`https://omarchyplugins.com/plugin.html?id=${plugin.id}`}
									target="_blank"
									rel="noreferrer"
								/>
							}
							color="blue"
							bloom="aura"
						>
							Omarchy Plugins ↗
						</DitherButton>
						{plugin.repo && (
							<a
								href={plugin.repo}
								target="_blank"
								rel="noreferrer"
								className="font-mono text-muted-foreground text-sm hover:text-foreground hover:underline"
							>
								GitHub{typeof plugin.stars === "number" ? ` · ${fmt(plugin.stars)} ★` : ""}
							</a>
						)}
					</div>
				</div>
			</div>

			{snapshots.length > 0 ? (
				<AreaChart
					data={rows}
					config={{
						hearts: { label: "Hearts", color: "pink" },
						views: { label: "Views", color: "blue" },
						copies: { label: "Copies", color: "green" },
					}}
					bloom="low"
					className="h-72 w-full"
				>
					<XAxis dataKey="snapshotAt" maxTicks={4} tickFormatter={(v) => fmtMonthDay(String(v))} />
					<YAxis />
					<Legend isClickable />
					<ChartTooltip labelKey="snapshotAt" headingFormatter={(h) => fmtDateTime(h)} />
					<Area dataKey="hearts" variant="gradient" />
					<Area dataKey="views" variant="hatched" />
					<Area dataKey="copies" variant="dotted" />
				</AreaChart>
			) : (
				<Empty>
					<EmptyTitle>No snapshots yet. Stats appear after the next poll.</EmptyTitle>
				</Empty>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard label="Average hearts" value={averages.hearts} />
				<StatCard label="Average views" value={averages.views} />
				<StatCard label="Average copies" value={averages.copies} />
			</div>
		</div>
	);
}
