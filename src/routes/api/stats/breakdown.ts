import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import type { BreakdownResponse } from "@/lib/api-types";

export const Route = createFileRoute("/api/stats/breakdown")({
	server: {
		handlers: {
			GET: async () => {
				const db = drizzle(env.DB);
				const [verification, installStatus, [{ total }]] = await db.batch([
					db
						.select({ status: plugins.currentVerificationStatus, count: count() })
						.from(plugins)
						.groupBy(plugins.currentVerificationStatus),
					db.select({ status: plugins.status, count: count() }).from(plugins).groupBy(plugins.status),
					db.select({ total: count() }).from(plugins),
				]);
				const verifiedCount = verification.find((row) => row.status === "verified")?.count ?? 0;
				return Response.json({
					verification,
					installStatus,
					totalPlugins: total,
					verifiedCount,
				} satisfies BreakdownResponse);
			},
		},
	},
});
