import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, count, desc, isNotNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { SearchResponse } from "@/lib/api-types";

/** Escape LIKE wildcards so the query matches literally. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const AUTHOR_LIMIT = 4;

const pluginFields = {
	id: plugins.id,
	name: plugins.name,
	author: plugins.author,
	category: plugins.category,
	hearts: plugins.currentHearts,
} as const;

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const q = new URL(request.url).searchParams;
				const raw = q.get("q")?.trim() ?? "";
				const pluginLimit = Math.min(20, Math.max(1, parseInt(q.get("limit") ?? "8", 10) || 8));
				const db = drizzle(env.DB);
				const live = isNotNull(plugins.currentSnapshotAt);

				// Empty query: the palette landing state is the most-loved plugins and authors.
				if (!raw) {
					const [topPlugins, topAuthors] = await db.batch([
						db
							.select(pluginFields)
							.from(plugins)
							.where(live)
							.orderBy(desc(plugins.currentHearts))
							.limit(pluginLimit),
						db
							.select({
								author: plugins.author,
								plugins: count(plugins.id),
								hearts: sql<number | null>`sum(${plugins.currentHearts})`,
							})
							.from(plugins)
							.where(live)
							.groupBy(plugins.author)
							.orderBy(desc(sql`sum(${plugins.currentHearts})`))
							.limit(AUTHOR_LIMIT),
					]);
					return Response.json({ q: raw, plugins: topPlugins, authors: topAuthors } satisfies SearchResponse);
				}

				const esc = escapeLike(raw);
				const prefix = `${esc}%`;
				const sub = `%${esc}%`;
				// Prefix hits rank above substring hits; popularity breaks ties.
				const rank = sql<number>`case
					when ${plugins.name} like ${prefix} escape '\\' then 0
					when ${plugins.id} like ${prefix} escape '\\' then 1
					when ${plugins.author} like ${prefix} escape '\\' then 2
					when ${plugins.name} like ${sub} escape '\\' then 3
					when ${plugins.id} like ${sub} escape '\\' then 4
					else 5 end`;
				const match = or(
					sql`${plugins.name} like ${sub} escape '\\'`,
					sql`${plugins.id} like ${sub} escape '\\'`,
					sql`${plugins.author} like ${sub} escape '\\'`,
					sql`${plugins.description} like ${sub} escape '\\'`,
					sql`${plugins.category} like ${sub} escape '\\'`,
					sql`${plugins.tags} like ${sub} escape '\\'`,
				);

				const [foundPlugins, foundAuthors] = await db.batch([
					db
						.select(pluginFields)
						.from(plugins)
						.where(and(live, match))
						.orderBy(rank, desc(plugins.currentHearts), desc(plugins.stars))
						.limit(pluginLimit),
					db
						.select({
							author: plugins.author,
							plugins: count(plugins.id),
							hearts: sql<number | null>`sum(${plugins.currentHearts})`,
						})
						.from(plugins)
						.where(and(live, sql`${plugins.author} like ${sub} escape '\\'`))
						.groupBy(plugins.author)
						.orderBy(
							sql`case when ${plugins.author} like ${prefix} escape '\\' then 0 else 1 end`,
							desc(sql`sum(${plugins.currentHearts})`),
						)
						.limit(AUTHOR_LIMIT),
				]);
				return Response.json({ q: raw, plugins: foundPlugins, authors: foundAuthors } satisfies SearchResponse);
			},
		},
	},
});
