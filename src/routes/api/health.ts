import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { count, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { pluginSnapshots, plugins } from "@/db/schema";
import type { HealthResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				const db = drizzle(env.DB);
				const [snap] = await db
					.select({ at: max(pluginSnapshots.snapshotAt) })
					.from(pluginSnapshots)
					.all();
				const [{ pluginCount }] = await db.select({ pluginCount: count() }).from(plugins).all();
				const [{ snapshotCount }] = await db.select({ snapshotCount: count() }).from(pluginSnapshots).all();
				return Response.json({
					lastSnapshotAt: snap?.at ?? null,
					pluginCount,
					snapshotCount,
				} satisfies HealthResponse);
			},
		},
	},
});
