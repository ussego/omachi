/** @jsxImportSource react */
import { Link } from "@tanstack/react-router";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { TrendingResponse } from "@/lib/api-types";
import { fmt } from "@/lib/format";

/** Δ hearts/views/copies leaderboard; used by the Leaderboards trending tab and the Overview. */
export function TrendingTable({ top, limit = 8 }: { top: TrendingResponse["top"]; limit?: number }) {
	const rows = top.slice(0, limit);

	if (rows.length === 0) {
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
				{rows.map((r) => (
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
								<Link to="/authors/$authorId" params={{ authorId: r.author }} className="hover:underline">
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
