/** @jsxImportSource react */
import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import { DitherAvatar } from "@/components/dither-kit/avatar";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorDetail, useErrorToast } from "@/lib/queries";
import { fmt } from "@/lib/format";

export const Route = createLazyFileRoute("/authors/$authorId")({
	component: AuthorDetailPage,
});

function AuthorDetailPage() {
	const { authorId } = useParams({ from: "/authors/$authorId" });
	const { data, isLoading, isError, error } = useAuthorDetail(authorId);
	useErrorToast(isError, error instanceof Error ? error.message : String(error));
	useEffect(() => {
		if (data) document.title = `${data.author} · omastats`;
	}, [data]);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex items-center gap-4">
					<Skeleton className="size-12 rounded-full" />
					<Skeleton className="h-8 w-48" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<Empty>
				<EmptyTitle>Author not found</EmptyTitle>
			</Empty>
		);
	}

	const { author, totals, plugins } = data;
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center gap-4">
				<DitherAvatar name={author} className="size-12 shrink-0" animate={false} />
				<div className="flex flex-col">
					<h1 className="font-heading text-2xl">{author}</h1>
					<p className="font-mono text-muted-foreground text-xs">
						{totals.plugins} plugin{totals.plugins === 1 ? "" : "s"}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard label="Hearts" value={totals.hearts} />
				<StatCard label="Views" value={totals.views} />
				<StatCard label="Copies" value={totals.copies} />
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Plugin</TableHead>
						<TableHead>Category</TableHead>
						<TableHead className="text-right">Hearts</TableHead>
						<TableHead className="text-right">Views</TableHead>
						<TableHead className="text-right">Copies</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{plugins.map((p) => (
						<TableRow key={p.id}>
							<TableCell className="font-medium">
								<Link
									to="/plugins/$pluginId"
									params={{ pluginId: p.id }}
									title={p.id}
									className="block max-w-56 truncate hover:underline"
								>
									{p.name ?? p.id}
								</Link>
							</TableCell>
							<TableCell className="text-muted-foreground">{p.category}</TableCell>
							<TableCell className="text-right font-mono tabular-nums">{fmt(p.hearts)}</TableCell>
							<TableCell className="text-right font-mono tabular-nums">{fmt(p.views)}</TableCell>
							<TableCell className="text-right font-mono tabular-nums">{fmt(p.copies)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
