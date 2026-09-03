import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					"User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://stats.ussego.com/sitemap.xml\n",
					{
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					},
				),
		},
	},
});
