/** @jsxImportSource react */

import { Graph, GraphBody } from "@/components/graph-frame/graph-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STAT_COLUMNS: Record<number, string> = {
	1: "sm:grid-cols-1",
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-4",
};

/**
 * Loading placeholder that mirrors GraphStat's geometry — the dashed frame,
 * body padding, and the value/label column grid — so the swap to real tiles
 * never moves the layout.
 */
export function GraphStatSkeleton({
	title,
	items = 3,
	className,
}: {
	title?: string;
	items?: number;
	className?: string;
}) {
	const columns = Math.min(items, 4);
	return (
		<Graph title={title} className={cn("select-none", className)} aria-hidden="true">
			<GraphBody>
				<div className={cn("grid gap-8", STAT_COLUMNS[columns])}>
					{Array.from({ length: items }, (_, index) => (
						<div className="flex flex-col gap-2" key={index}>
							<Skeleton className="h-9 w-28" />
							<Skeleton className="h-4 w-20" />
						</div>
					))}
				</div>
			</GraphBody>
		</Graph>
	);
}

/**
 * Loading placeholder that mirrors GraphRank's geometry — same dashed frame,
 * body padding, and row grid (label / track / value) — so the swap to real
 * rows never moves the layout.
 */
export function GraphRankSkeleton({
	title,
	rows = 10,
	className,
}: {
	title?: string;
	rows?: number;
	className?: string;
}) {
	return (
		<Graph title={title} className={cn("select-none", className)} aria-hidden="true">
			<GraphBody className="flex flex-col gap-3">
				<ol className="flex w-full list-none flex-col gap-2">
					{Array.from({ length: rows }, (_, index) => (
						<li
							className="grid grid-cols-[5rem_minmax(0,1fr)_5rem] items-center gap-x-4 sm:grid-cols-[7rem_minmax(0,1fr)_7rem]"
							key={index}
						>
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-12 justify-self-end" />
						</li>
					))}
				</ol>
			</GraphBody>
		</Graph>
	);
}

/**
 * Loading placeholder that mirrors GraphPlot's geometry: the y-axis gutter,
 * the plot block, and the rule/label rows keep the same heights as the real
 * chart.
 */
export function GraphPlotSkeleton({
	title,
	height = 7,
	className,
}: {
	title?: string;
	height?: number;
	className?: string;
}) {
	return (
		<Graph title={title} className={cn("select-none", className)} aria-hidden="true">
			<GraphBody className="flex flex-col gap-3">
				<div className="flex gap-3">
					<Skeleton className="w-[4ch] shrink-0" style={{ height: `${height}em` }} />
					<Skeleton className="w-full" style={{ height: `${height}em` }} />
				</div>
				<div className="flex gap-3">
					<span aria-hidden="true" className="invisible w-[4ch] shrink-0" />
					<Skeleton className="h-5 w-full" />
				</div>
				<div className="flex gap-3">
					<span aria-hidden="true" className="invisible w-[4ch] shrink-0" />
					<Skeleton className="h-5 w-1/2" />
				</div>
			</GraphBody>
		</Graph>
	);
}
