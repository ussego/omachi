import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { pluginSnapshots, plugins } from "@/db/schema";
import { withoutCurrent } from "@/lib/api-helpers";
import type { PluginDetailResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/plugins/$id")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const db = drizzle(env.DB);
				const [plugin] = await db.select().from(plugins).where(eq(plugins.id, params.id)).all();
				if (!plugin) return Response.json({ error: "not found" }, { status: 404 });
				const snapshots = await db
					.select()
					.from(pluginSnapshots)
					.where(eq(pluginSnapshots.pluginId, params.id))
					.orderBy(pluginSnapshots.snapshotAt)
					.all();
				const avg = (key: "views" | "copies" | "hearts") => {
					const values = snapshots
						.map((snapshot) => snapshot[key])
						.filter((value): value is number => value != null);
					return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
				};
				return Response.json({
					plugin: { ...withoutCurrent(plugin), tags: plugin.tags ? JSON.parse(plugin.tags) : null },
					snapshots,
					averages: { views: avg("views"), copies: avg("copies"), hearts: avg("hearts") },
				} satisfies PluginDetailResponse);
			},
		},
	},
});
