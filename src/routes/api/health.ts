import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { count, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { meta, pluginSnapshots, plugins } from "@/db/schema";
import type { HealthResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				const db = drizzle(env.DB);
				const [snap, pluginCount, snapshotCount] = await Promise.all([
					db.select({ at: max(pluginSnapshots.snapshotAt) }).from(pluginSnapshots).all(),
					db.select({ value: count() }).from(plugins).all(),
					// Running total maintained by the heavy poll (meta table); the
					// table itself is far too large to COUNT(*) on every request.
					db.select({ value: meta.value }).from(meta).where(eq(meta.key, "snapshot_count")).all(),
				]);
				return Response.json({
					lastSnapshotAt: snap[0]?.at ?? null,
					pluginCount: pluginCount[0]?.value ?? 0,
					snapshotCount: snapshotCount[0]?.value ?? null,
				} satisfies HealthResponse);
			},
		},
	},
});
