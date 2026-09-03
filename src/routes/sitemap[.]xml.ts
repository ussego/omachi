import "@tanstack/react-start";
import { env, waitUntil } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import { sitemapXml } from "@/lib/site";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const cache = (globalThis.caches as unknown as { default: Cache }).default;
				const key = new Request(new URL("/sitemap.xml", request.url));
				const hit = await cache.match(key);
				if (hit) return hit;

				const rows = await drizzle(env.DB)
					.select({ id: plugins.id, author: plugins.author, currentSnapshotAt: plugins.currentSnapshotAt })
					.from(plugins)
					.all();
				const response = new Response(sitemapXml(rows), {
					headers: {
						"Cache-Control": "public, s-maxage=86400",
						"Content-Type": "application/xml; charset=utf-8",
					},
				});
				waitUntil(cache.put(key, response.clone()));
				return response;
			},
		},
	},
});
