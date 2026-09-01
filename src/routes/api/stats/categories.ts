import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { count, desc, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { CategoriesResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/stats/categories")({
	server: {
		handlers: {
			GET: async () => {
				const db = drizzle(env.DB);
				const rows = await db
					.select({
						category: plugins.category,
						count: count(plugins.id),
						avgHearts: sql<number | null>`round(avg(${plugins.currentHearts}))`,
						avgViews: sql<number | null>`round(avg(${plugins.currentViews}))`,
						avgCopies: sql<number | null>`round(avg(${plugins.currentCopies}))`,
					})
					.from(plugins)
					.where(isNotNull(plugins.currentSnapshotAt))
					.groupBy(plugins.category)
					.orderBy(desc(count(plugins.id)))
					.all();
				return Response.json({ rows } satisfies CategoriesResponse);
			},
		},
	},
});
