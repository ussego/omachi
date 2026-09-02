/** @jsxImportSource react */
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { UnverifiedResponse } from "@/lib/api-types";
import { fmtDate, truncate } from "@/lib/format";

export function UnverifiedPluginsTable({ plugins }: { plugins: UnverifiedResponse["plugins"] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Plugin</TableHead>
					<TableHead>Author</TableHead>
					<TableHead>Verification</TableHead>
					<TableHead className="text-right">Repo updated</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{plugins.map((p) => (
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
									{truncate(p.author)}
								</Link>
							) : (
								"—"
							)}
						</TableCell>
						<TableCell>
							<Badge variant="error" className="font-mono uppercase">
								{p.currentVerificationStatus ?? "unverified"}
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
