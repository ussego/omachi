import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { count, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { AuthorsResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/authors/leaderboard")({
	server: {
		handlers: {
			GET: async () => {
				const db = drizzle(env.DB);
				const rows = await db
					.select({
						author: plugins.author,
						plugins: count(plugins.id),
						views: sql<number | null>`sum(${plugins.currentViews})`,
						copies: sql<number | null>`sum(${plugins.currentCopies})`,
						hearts: sql<number | null>`sum(${plugins.currentHearts})`,
					})
					.from(plugins)
					.where(sql`${plugins.currentSnapshotAt} is not null`)
					.groupBy(plugins.author)
					.orderBy(desc(sql`sum(${plugins.currentHearts})`))
					.all();
				return Response.json({ rows } satisfies AuthorsResponse);
			},
		},
	},
});
