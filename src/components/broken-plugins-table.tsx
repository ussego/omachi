/** @jsxImportSource react */
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { BrokenResponse } from "@/lib/api-types";
import { fmtDate } from "@/lib/format";

/** Unreachable/stale upstream plugins; used by Ecosystem Health and the Overview. */
export function BrokenPluginsTable({
	plugins,
	limit,
}: {
	plugins: BrokenResponse["plugins"];
	limit?: number;
}) {
	const rows = limit ? plugins.slice(0, limit) : plugins;
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Plugin</TableHead>
					<TableHead>Author</TableHead>
					<TableHead>Upstream</TableHead>
					<TableHead className="text-right">Repo updated</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((p) => (
					<TableRow key={p.pluginId}>
						<TableCell>
							<Link
								to="/plugins/$pluginId"
								params={{ pluginId: p.pluginId }}
								className="font-medium hover:underline"
							>
								{p.name ?? p.pluginId}
							</Link>
						</TableCell>
						<TableCell className="text-muted-foreground">
							{p.author ? (
								<Link to="/authors/$authorId" params={{ authorId: p.author }} className="hover:underline">
									{p.author}
								</Link>
							) : (
								"—"
							)}
						</TableCell>
						<TableCell>
							<Badge
								variant={
									p.upstreamCheckStatus === "unreachable" || p.upstreamCheckStatus === "failed"
										? "error"
										: "warning"
								}
								className="font-mono uppercase"
							>
								{p.upstreamCheckStatus ?? "stale"}
							</Badge>
						</TableCell>
						<TableCell className="text-right font-mono tabular-nums">
							{fmtDate(p.repositoryUpdatedAt)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
