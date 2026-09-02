import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { pluginSnapshots, plugins } from "@/db/schema";
import type { AuthorDetailResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/authors/$authorId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const db = drizzle(env.DB);
				const author = params.authorId;
				const rows = await db
					.select({
						id: plugins.id,
						name: plugins.name,
						category: plugins.category,
						kind: plugins.kind,
						status: plugins.status,
						repo: plugins.repo,
						addedAt: plugins.addedAt,
						views: plugins.currentViews,
						copies: plugins.currentCopies,
						hearts: plugins.currentHearts,
					})
					.from(plugins)
					.where(and(eq(plugins.author, author), isNotNull(plugins.currentSnapshotAt)))
					.orderBy(desc(plugins.currentHearts))
					.all();
				if (!rows.length) return Response.json({ error: "not found" }, { status: 404 });
				// Per-poll totals across the author's plugins, ascending. One JOIN +
				// GROUP BY keeps this inside the aggregate-query budget.
				const activity = await db
					.select({
						snapshotAt: pluginSnapshots.snapshotAt,
						views: sql<number>`coalesce(sum(${pluginSnapshots.views}), 0)`,
						copies: sql<number>`coalesce(sum(${pluginSnapshots.copies}), 0)`,
						hearts: sql<number>`coalesce(sum(${pluginSnapshots.hearts}), 0)`,
					})
					.from(pluginSnapshots)
					.innerJoin(plugins, eq(pluginSnapshots.pluginId, plugins.id))
					.where(eq(plugins.author, author))
					.groupBy(pluginSnapshots.snapshotAt)
					.orderBy(pluginSnapshots.snapshotAt)
					.all();
				const sum = (key: "views" | "copies" | "hearts") =>
					rows.reduce((total, row) => total + (row[key] ?? 0), 0);
				return Response.json({
					author,
					totals: { plugins: rows.length, views: sum("views"), copies: sum("copies"), hearts: sum("hearts") },
					plugins: rows,
					activity,
				} satisfies AuthorDetailResponse);
			},
		},
	},
});
