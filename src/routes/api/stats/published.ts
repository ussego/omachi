import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import { countsRoute } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/stats/published")({
	server: { handlers: { GET: countsRoute(drizzle(env.DB), plugins, plugins.addedAt) } },
});
