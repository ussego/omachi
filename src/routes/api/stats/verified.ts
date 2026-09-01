import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { verificationEvents } from "@/db/schema";
import { countsRoute } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/stats/verified")({
	server: {
		handlers: {
			GET: countsRoute(drizzle(env.DB), verificationEvents, verificationEvents.occurredAt, (q) => {
				const toStatus = q.get("toStatus");
				return toStatus ? [sql`${verificationEvents.toStatus} = ${toStatus}`] : [];
			}),
		},
	},
});
