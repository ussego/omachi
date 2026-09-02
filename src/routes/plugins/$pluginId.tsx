/** @jsxImportSource react */

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GraphRule as FigureRule, Graph, GraphBody } from "@/components/graph-frame/graph-frame";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { GraphPlot } from "@/components/graph-plot";
import { GraphPlotSkeleton, GraphStatSkeleton } from "@/components/graph-skeleton";
import { GraphStat } from "@/components/graph-stat";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, fmtDate, fmtMonthDay } from "@/lib/format";
import { useErrorToast, useLeaderboard, usePluginDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plugins/$pluginId")({
	head: ({ params }) => ({
		meta: [
			{ title: `${params.pluginId} · Omachi` },
			{
				name: "description",
				content: `Hearts, views, copies, and snapshot history for the ${params.pluginId} plugin in the Omarchy catalog.`,
			},
		],
	}),
	component: PluginDetailPage,
});

const DETAILS_SKELETON = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RELATED_SKELETON = ["a", "b", "c", "d", "e", "f"];

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
		if (data?.plugin.name) document.title = `${data.plugin.name} · Omachi`;
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
		// Mirror the settled layout so the swap to real content never jumps:
		// header block, three plot frames, and the stat card row.
		return (
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap items-stretch gap-4">
					<Graph title="Details" className="min-w-0 flex-1 select-none" aria-hidden="true">
						<GraphBody className="flex flex-col gap-5">
							<div className="flex flex-col gap-2">
								<Skeleton className="h-8 w-1/2" />
								<Skeleton className="h-4 w-full max-w-2xl" />
								<Skeleton className="h-4 w-2/3 max-w-2xl" />
								<Skeleton className="h-4 w-1/2 max-w-2xl" />
							</div>
							<FigureRule />
							<div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
								{DETAILS_SKELETON.map((k) => (
									<div className="flex flex-col gap-1.5" key={k}>
										<Skeleton className="h-3 w-16" />
										<Skeleton className="h-4 w-28" />
									</div>
								))}
							</div>
						</GraphBody>
					</Graph>
					<Graph title="Rank" className="w-full select-none sm:w-48" aria-hidden="true">
						<GraphBody className="flex flex-col gap-3 px-5 py-5">
							<div className="flex flex-col gap-1.5">
								<Skeleton className="h-9 w-20" />
								<Skeleton className="h-4 w-32" />
							</div>
							<FigureRule />
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-4 w-24" />
						</GraphBody>
					</Graph>
				</div>

				<Graph title="Related" className="w-full select-none" aria-hidden="true">
					<GraphBody className="flex flex-col gap-5">
						<Skeleton className="h-3 w-80" />
						<div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
							{RELATED_SKELETON.map((k) => (
								<div className="flex flex-col gap-1.5" key={k}>
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							))}
						</div>
					</GraphBody>
				</Graph>

				<div className="grid gap-6 lg:grid-cols-3">
					<GraphPlotSkeleton title="Hearts" />
					<GraphPlotSkeleton title="Views" />
					<GraphPlotSkeleton title="Copies" />
				</div>

				<GraphRule />

				<GraphStatSkeleton title="Averages" items={3} />
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

	const { plugin, snapshots, averages, relations } = data;
	const last = snapshots[snapshots.length - 1];
	// Manual-setup plugins aren't installed through the catalog, so the feed
	// never records copies for them — don't draw an all-zero Copies plot.
	const manualSetup = plugin.status === "Manual setup";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-stretch gap-4">
				<Graph title="Details" className="min-w-0 flex-1">
					<GraphBody className="flex flex-col gap-5">
						<div className="flex flex-col gap-2">
							<h1 className="text-balance font-heading text-2xl">{plugin.name ?? plugin.id}</h1>
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
						</div>
						<FigureRule />
						<dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">author</dt>
								<dd>
									{plugin.author ? (
										<Link
											to="/authors/$authorId"
											params={{ authorId: plugin.author }}
											className="text-muted-foreground hover:text-foreground hover:underline"
										>
											{plugin.author}
										</Link>
									) : (
										"—"
									)}
								</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">plugin id</dt>
								<dd className="break-all">{plugin.id}</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">category</dt>
								<dd>{plugin.category ?? "—"}</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">license</dt>
								<dd>{plugin.license ?? "—"}</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">added</dt>
								<dd>{fmtDate(plugin.addedAt)}</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">status</dt>
								<dd className="flex flex-wrap items-center gap-1.5">
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
								</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">family</dt>
								<dd>{relations?.cluster ?? "—"}</dd>
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<dt className="text-xs tracking-wide text-graph-muted uppercase">influence</dt>
								<dd title="graph influence in the omarchy explorer similarity graph">
									{typeof relations?.influence === "number" ? relations.influence.toFixed(1) : "—"}
								</dd>
							</div>
						</dl>
					</GraphBody>
				</Graph>
				<Graph title="Rank" className="w-full sm:w-48">
					<GraphBody className="flex flex-col gap-3 px-5 py-5">
						<div className="flex flex-col gap-1.5">
							<p className="text-3xl tracking-tight tabular-nums sm:text-4xl">
								#{rankOf(plugin.id) ?? "—"}
							</p>
							<p className="text-graph-muted">current rank (hearts)</p>
						</div>
						<FigureRule />
						<div className="flex flex-col items-start gap-2">
							<a
								href={`https://plugins.omarchy.org/plugin.html?id=${plugin.id}`}
								target="_blank"
								rel="noreferrer"
								className="font-mono text-xs tracking-wide text-graph-accent uppercase transition-colors hover:text-foreground"
							>
								omarchy plugins ↗
							</a>
							{plugin.repo && (
								<a
									href={plugin.repo}
									target="_blank"
									rel="noreferrer"
									className="font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
								>
									github{typeof plugin.stars === "number" ? ` · ${fmt(plugin.stars)} ★` : ""}
								</a>
							)}
						</div>
					</GraphBody>
				</Graph>
			</div>

			{relations?.related.length ? (
				<Graph title="Related" className="w-full">
					<GraphBody className="flex flex-col gap-5">
						<p className="text-xs text-graph-muted">
							nearest neighbors by description similarity, from the omarchy explorer
						</p>
						<ul className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
							{relations.related.slice(0, 8).map((r) => (
								<li key={r.pluginId} className="flex min-w-0 flex-col gap-1">
									<Link
										to="/plugins/$pluginId"
										params={{ pluginId: r.pluginId }}
										title={`${r.name ?? r.pluginId} · ${Math.round(r.similarity * 100)}% similar`}
										className="truncate font-medium hover:underline"
									>
										{r.name ?? r.pluginId}
									</Link>
									<div className="flex items-baseline justify-between gap-3">
										<span className="truncate text-xs text-muted-foreground">
											{r.author ?? "—"}
										</span>
										<span className="font-mono text-xs text-graph-muted tabular-nums">
											{Math.round(r.similarity * 100)}%
										</span>
									</div>
								</li>
							))}
						</ul>
					</GraphBody>
				</Graph>
			) : (
				<Graph title="Related" className="w-full">
					<GraphBody className="flex flex-col items-center justify-center px-5 py-7 text-center sm:px-8">
						<p className="text-graph-muted">no related plugins yet</p>
					</GraphBody>
				</Graph>
			)}

			{snapshots.length > 0 ? (
				<div className="grid gap-6 lg:grid-cols-3">
					<GraphPlot
						title="Hearts"
						data={rows.map((row) => row.hearts)}
						labels={rows.map((row) => fmtMonthDay(row.snapshotAt))}
					/>
					<GraphPlot
						title="Views"
						data={rows.map((row) => row.views)}
						labels={rows.map((row) => fmtMonthDay(row.snapshotAt))}
					/>
					{manualSetup ? (
						<Graph title="Copies" className="w-full">
							<GraphBody className="flex h-full flex-col items-center justify-center px-5 py-7 text-center sm:px-8">
								<p className="text-graph-muted">copies aren't tracked for manual-setup plugins</p>
							</GraphBody>
						</Graph>
					) : (
						<GraphPlot
							title="Copies"
							data={rows.map((row) => row.copies)}
							labels={rows.map((row) => fmtMonthDay(row.snapshotAt))}
						/>
					)}
				</div>
			) : (
				<Empty>
					<EmptyTitle>No snapshots yet. Stats appear after the next poll.</EmptyTitle>
				</Empty>
			)}

			<GraphRule />

			<GraphStat
				title="Averages"
				items={[
					{ value: fmt(averages.hearts), label: "average hearts" },
					{ value: fmt(averages.views), label: "average views" },
					...(manualSetup ? [] : [{ value: fmt(averages.copies), label: "average copies" }]),
				]}
			/>
		</div>
	);
}
