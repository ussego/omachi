/** @jsxImportSource react */
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { TrendingResponse } from "@/lib/api-types";
import { fmt } from "@/lib/format";
import { useSkeletonDelay } from "@/lib/loading";

const SKELETON = ["a", "b", "c", "d", "e"];

/** Δ hearts/views/copies leaderboard; used by the Leaderboards trending tab and the Overview. */
export function TrendingTable({
	top,
	loading,
	limit = 8,
}: {
	top: TrendingResponse["top"];
	loading: boolean;
	limit?: number;
}) {
	const rows = top.slice(0, limit);
	// Skeleton only after the grace period; inside it the real table chrome
	// stays visible with an empty body instead of a flashing placeholder.
	const showSkeleton = useSkeletonDelay(loading);

	if (!loading && rows.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				No trending plugins yet. Stats appear once the catalog has enough snapshot history.
			</p>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Plugin</TableHead>
					<TableHead>Author</TableHead>
					<TableHead className="text-right">Δ hearts</TableHead>
					<TableHead className="text-right">Δ views</TableHead>
					<TableHead className="text-right">Δ copies</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{showSkeleton
					? SKELETON.slice(0, 5).map((k) => (
							<TableRow key={k}>
								<TableCell colSpan={5}>
									<Skeleton className="h-5 w-full" />
								</TableCell>
							</TableRow>
						))
					: rows.map((r) => (
							<TableRow key={r.pluginId}>
								<TableCell>
									<Link
										to="/plugins/$pluginId"
										params={{ pluginId: r.pluginId }}
										title={r.name ?? r.pluginId}
										className="block max-w-56 truncate font-medium hover:underline"
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
								<TableCell className="text-right font-mono tabular-nums">+{fmt(r.hearts)}</TableCell>
								<TableCell className="text-right font-mono tabular-nums">+{fmt(r.views)}</TableCell>
								<TableCell className="text-right font-mono tabular-nums">+{fmt(r.copies)}</TableCell>
							</TableRow>
						))}
			</TableBody>
		</Table>
	);
}
