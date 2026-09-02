/** @jsxImportSource react */
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { UnverifiedResponse } from "@/lib/api-types";
import { fmtDate, truncate } from "@/lib/format";
import { useSkeletonDelay } from "@/lib/loading";

const SKELETON = ["a", "b", "c", "d", "e"];

export function UnverifiedPluginsTable({
	plugins,
	loading,
}: {
	plugins: UnverifiedResponse["plugins"];
	loading: boolean;
}) {
	const showSkeleton = useSkeletonDelay(loading);
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
				{showSkeleton
					? SKELETON.map((k) => (
							<TableRow key={k}>
								<TableCell colSpan={4}>
									<Skeleton className="h-5 w-full" />
								</TableCell>
							</TableRow>
						))
					: plugins.map((p) => (
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
										<Link
											to="/authors/$authorId"
											params={{ authorId: p.author }}
											className="hover:underline"
										>
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
