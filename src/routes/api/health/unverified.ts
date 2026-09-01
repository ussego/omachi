import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { UnverifiedResponse } from "@/lib/api-types";

const dayMs = 864e5;

export const Route = createFileRoute("/api/health/unverified")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const q = new URL(request.url).searchParams;
				const days = { "7d": 7, "14d": 14, "30d": 30 }[q.get("range") ?? "30d"] ?? 30;
				const from = new Date(Date.now() - days * dayMs).toISOString();
				const rows = await drizzle(env.DB)
					.select({
						pluginId: plugins.id,
						name: plugins.name,
						author: plugins.author,
						currentVerificationStatus: plugins.currentVerificationStatus,
						repositoryUpdatedAt: plugins.currentRepositoryUpdatedAt,
					})
					.from(plugins)
					.where(
						and(
							eq(plugins.currentVerificationStatus, "unverified"),
							isNotNull(plugins.currentRepositoryUpdatedAt),
							sql`${plugins.currentRepositoryUpdatedAt} >= ${from}`,
						),
					)
					.orderBy(plugins.id)
					.all();
				return Response.json({ rangeDays: days, plugins: rows } satisfies UnverifiedResponse);
			},
		},
	},
});
