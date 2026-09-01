import { Hono } from "hono";

import { api } from "./lib/api";
import { pollNewPlugins } from "./lib/light-poll";
import { runSnapshot } from "./lib/snapshot";
import { renderer } from "./renderer";
import { Shell } from "./shell";

const LLMS_TXT = `# omastats

> Live analytics for the Omarchy plugin catalog: hearts, views, copies, leaderboards, ecosystem health, categories, and embeddable badges. Snapshots refresh every 6 hours; new-plugin counts every 30 minutes.

## omastats

- [Overview](https://stats.ussego.com/): catalog totals and trend charts for hearts, views, copies, and new plugins.
- [Leaderboards](https://stats.ussego.com/leaderboards): top plugins by hearts, views, copies, and conversion, plus trending and author leaderboards.
- [Ecosystem Health](https://stats.ussego.com/health): verification status, install availability, and broken plugins.
- [Categories](https://stats.ussego.com/categories): plugin counts and engagement by category, with a monthly activity heatmap.
- [Badges](https://stats.ussego.com/badges): embeddable stat badges for plugins and authors.
- [API](https://stats.ussego.com/api/health): JSON endpoints behind the dashboard, edge-cached hourly.
`;

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(renderer);

app.route("/api", api);

// Static SEO files: registered before the SPA catch-all so they aren't swallowed.
app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\nDisallow: /api/\n"));
app.get("/llms.txt", (c) => c.text(LLMS_TXT));

// SPA shell: every non-API GET serves the app; routing happens client-side.
// Registered after /api so it never swallows API routes.
app.get("*", (c) =>
	c.render(
		<div id="root">
			<Shell path={new URL(c.req.url).pathname} />
		</div>,
	),
);

app.onError((err, c) => {
	console.error(err);
	return c.json({ error: err instanceof Error ? err.message : "internal error" }, 500);
});

export default {
	fetch: app.fetch,

	/**
	 * Cron triggers (see wrangler.jsonc):
	 * - every 30 min: light poll; keep the plugin count fresh
	 * - every 6 h: heavy snapshot; full poll, diff, snapshot append, prune
	 */
	scheduled: async (ctl: ScheduledController, env: CloudflareBindings) => {
		if (ctl.cron === "*/30 * * * *") {
			const result = await pollNewPlugins(env);
			console.log(`light poll: ${JSON.stringify(result)}`);
			return;
		}
		const result = await runSnapshot(env);
		console.log(`snapshot complete: ${JSON.stringify(result)}`);
	},
};
