import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

const LLMS_TXT = `# Omachi

> An independent companion dashboard for the Omarchy plugin catalog: hearts, views, copies, leaderboards, ecosystem health, categories, and embeddable badges. Snapshots refresh every 6 hours; new-plugin counts every 30 minutes.

## Omachi

- [Overview](https://stats.ussego.com/): catalog totals and trend charts for hearts, views, copies, and new plugins.
- [Leaderboards](https://stats.ussego.com/leaderboards): top plugins by hearts, views, copies, and conversion, plus trending and author leaderboards.
- [Ecosystem Health](https://stats.ussego.com/health): verification status, install availability, and broken plugins.
- [Categories](https://stats.ussego.com/categories): plugin counts and engagement by category, with a monthly activity heatmap.
- [Badges](https://stats.ussego.com/badges): embeddable stat badges for plugins and authors.
- [API](https://stats.ussego.com/api/health): JSON endpoints behind the dashboard; most GETs are edge-cached hourly, health endpoints respond uncached.
`;

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(LLMS_TXT, {
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				}),
		},
	},
});
