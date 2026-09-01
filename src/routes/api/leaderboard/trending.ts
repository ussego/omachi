import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { inArray, isNotNull, lte, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { pluginSnapshots, plugins } from "@/db/schema";

import type { TrendingResponse } from "@/lib/api-types";

const dayMs = 864e5;

export const Route = createFileRoute("/api/leaderboard/trending")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const q = new URL(request.url).searchParams;
				const days = parseInt(q.get("days") ?? "7", 10) || 7;
				const db = drizzle(env.DB);
				const cutoff = new Date(Date.now() - days * dayMs).toISOString();
				const [latest, old] = await Promise.all([
					db
						.select({
							pluginId: plugins.id,
							name: plugins.name,
							author: plugins.author,
							views: plugins.currentViews,
							copies: plugins.currentCopies,
							hearts: plugins.currentHearts,
						})
						.from(plugins)
						.where(isNotNull(plugins.currentSnapshotAt))
						.all(),
					db
						.select({
							pluginId: pluginSnapshots.pluginId,
							views: pluginSnapshots.views,
							copies: pluginSnapshots.copies,
							hearts: pluginSnapshots.hearts,
						})
						.from(pluginSnapshots)
						.where(
							inArray(
								pluginSnapshots.id,
								db
									.select({ id: max(pluginSnapshots.id) })
									.from(pluginSnapshots)
									.where(lte(pluginSnapshots.snapshotAt, cutoff))
									.groupBy(pluginSnapshots.pluginId),
							),
						)
						.all(),
				]);
				const oldBy = new Map(old.map((row) => [row.pluginId, row]));
				const deltas: TrendingResponse["top"] = [];
				for (const current of latest) {
					const previous = oldBy.get(current.pluginId);
					if (!previous) continue;
					const views = (current.views ?? 0) - (previous.views ?? 0);
					const copies = (current.copies ?? 0) - (previous.copies ?? 0);
					const hearts = (current.hearts ?? 0) - (previous.hearts ?? 0);
					if (hearts > 0 || views > 0)
						deltas.push({
							pluginId: current.pluginId,
							name: current.name,
							author: current.author,
							views,
							copies,
							hearts,
						});
				}
				deltas.sort((a, b) => b.hearts - a.hearts);
				return Response.json({ days, top: deltas.slice(0, 50) } satisfies TrendingResponse);
			},
		},
	},
});
