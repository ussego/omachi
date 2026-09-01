import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, inArray, isNotNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { BrokenResponse } from "@/lib/api-types";

const dayMs = 864e5;

export const Route = createFileRoute("/api/health/broken")({
	server: {
		handlers: {
			GET: async () => {
				const staleBefore = new Date(Date.now() - 365 * dayMs).toISOString();
				const rows = await drizzle(env.DB)
					.select({
						pluginId: plugins.id,
						name: plugins.name,
						author: plugins.author,
						upstreamCheckStatus: plugins.currentUpstreamCheckStatus,
						repositoryUpdatedAt: plugins.currentRepositoryUpdatedAt,
					})
					.from(plugins)
					.where(
						and(
							isNotNull(plugins.currentSnapshotAt),
							or(
								inArray(plugins.currentUpstreamCheckStatus, ["unreachable", "failed"]),
								lte(plugins.currentRepositoryUpdatedAt, staleBefore),
							),
						),
					)
					.orderBy(plugins.id)
					.all();
				return Response.json({ staleDays: 365, plugins: rows } satisfies BrokenResponse);
			},
		},
	},
});
