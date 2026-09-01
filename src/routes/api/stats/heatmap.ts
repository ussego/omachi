import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, count, type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { HeatmapResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/stats/heatmap")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const q = new URL(request.url).searchParams;
				const db = drizzle(env.DB);
				const month = sql<string>`substr(${plugins.addedAt}, 1, 7)`;
				const conds: SQL[] = [sql`${plugins.addedAt} is not null`];
				if (q.get("from")) conds.push(sql`${plugins.addedAt} >= ${q.get("from")!}`);
				if (q.get("to")) conds.push(sql`${plugins.addedAt} <= ${q.get("to")!}`);
				const rows = await db
					.select({ category: plugins.category, month, count: count() })
					.from(plugins)
					.where(and(...conds))
					.groupBy(plugins.category, month)
					.orderBy(month)
					.all();
				return Response.json({ points: rows } satisfies HeatmapResponse);
			},
		},
	},
});
