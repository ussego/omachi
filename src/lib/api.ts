import { and, count, desc, eq, inArray, isNotNull, like, lte, max, or, type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { type Context, Hono } from "hono";

import { pluginSnapshots, plugins, updateEvents, verificationEvents } from "../db/schema";
import type {
	AuthorDetailResponse,
	AuthorsResponse,
	BadgeResponse,
	BreakdownResponse,
	BrokenResponse,
	CategoriesResponse,
	ChartSeriesResponse,
	HealthResponse,
	HeatmapResponse,
	LeaderboardResponse,
	PluginDetailResponse,
	PluginListResponse,
	StatsResponse,
	TrendingResponse,
} from "./api-types";
import { badgeRank, badgeValue, isRankStat, isStat } from "./badges";
import {
	omastatsAuthor,
	omastatsPlugin,
	omastatsPublished,
	omastatsTotal,
	omastatsUpdated,
	omastatsVerified,
} from "./charts";
import { pollNewPlugins } from "./light-poll";
import { runSnapshot } from "./snapshot";

export const api = new Hono<{ Bindings: CloudflareBindings & { ADMIN_TOKEN?: string } }>();

type PluginRow = typeof plugins.$inferSelect;

/** Strip denormalized current_* fields from API responses. */
function withoutCurrent(r: PluginRow) {
	const {
		currentViews: _cv,
		currentCopies: _cc,
		currentHearts: _ch,
		currentVerificationStatus: _vs,
		currentVersion: _ver,
		currentRepositoryUpdatedAt: _ru,
		currentUpstreamCheckStatus: _us,
		currentSnapshotAt: _sa,
		...rest
	} = r;
	return rest;
}

/** Build the "latest snapshot" object from denormalized current_* columns. */
function latestFrom(r: PluginRow) {
	return r.currentSnapshotAt
		? {
				pluginId: r.id,
				snapshotAt: r.currentSnapshotAt,
				views: r.currentViews,
				copies: r.currentCopies,
				hearts: r.currentHearts,
				verificationStatus: r.currentVerificationStatus,
				version: r.currentVersion,
				repositoryUpdatedAt: r.currentRepositoryUpdatedAt,
				upstreamCheckStatus: r.currentUpstreamCheckStatus,
			}
		: null;
}

// Edge caching for read routes. Worker-generated responses are NOT cached by
// the CDN from Cache-Control alone (no cf-cache-status on the live site), so
// store them in the Cache API: repeat requests skip D1 entirely, 1h TTL via
// s-maxage (data only changes on cron runs). /health routes stay uncached.
// x-cache header added for observability.
api.use(async (c, next) => {
	if (c.req.method !== "GET") return next();
	if (c.req.path.startsWith("/api/health")) {
		await next();
		c.header("Cache-Control", "no-cache");
		return;
	}
	const url = new URL(c.req.url);
	const cache = caches.default;
	const hit = await cache.match(url);
	if (hit) {
		const headers = new Headers(hit.headers);
		headers.set("x-cache", "HIT");
		return new Response(hit.body, { status: hit.status, headers });
	}
	await next();
	const res = c.res;
	if (res && res.status >= 200 && res.status < 300) {
		const headers = new Headers(res.headers);
		headers.set("Cache-Control", "public, s-maxage=3600");
		headers.set("x-cache", "MISS");
		const out = new Response(res.body, { status: res.status, headers });
		c.executionCtx.waitUntil(cache.put(url, out.clone()));
		c.res = out;
	}
});

const dayMs = 864e5;

function groupLen(groupBy: string | undefined) {
	return groupBy === "day" ? 10 : groupBy === "year" ? 4 : 7; // month default
}

/** range=30d|90d|180d|365d|1y|all, or explicit from/to ISO dates. */
function dateRange(q: Record<string, string>) {
	let from: string | undefined;
	let to: string | undefined;
	const range = q.range;
	const days = { "30d": 30, "90d": 90, "180d": 180, "365d": 365, "1y": 365 }[range ?? ""];
	if (days) from = new Date(Date.now() - days * dayMs).toISOString().slice(0, 10);
	if (q.from) from = q.from;
	if (q.to) to = q.to;
	return { from, to };
}

// ── plugins ────────────────────────────────────────────────────────────────

api.get("/plugins", async (c) => {
	const q = c.req.query();
	const db = drizzle(c.env.DB);
	const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
	const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? "50", 10) || 50));

	const conds: SQL[] = [];
	if (q.q) {
		const like_ = `%${q.q}%`;
		conds.push(or(like(plugins.name, like_), like(plugins.author, like_), like(plugins.id, like_))!);
	}
	if (q.category) conds.push(eq(plugins.category, q.category));
	if (q.author) conds.push(eq(plugins.author, q.author));
	if (q.kind) conds.push(eq(plugins.kind, q.kind));
	if (q.verification) conds.push(eq(plugins.currentVerificationStatus, q.verification));
	const where = conds.length ? and(...conds) : undefined;

	const [{ total }] = await db.select({ total: count() }).from(plugins).where(where).all();
	const rows = await db
		.select()
		.from(plugins)
		.where(where)
		// ponytail: addedAt is day-granular (114+ plugins can share a date), so the
		// same-day tie-break on rowid (insertion ≈ discovery order, catalog arrays
		// are listedAt-ascending) keeps recent-lists newest-first; swap in a real
		// listed_at timestamp column if the upstream array order ever stops being
		// listedAt-ascending.
		.orderBy(...(q.sort === "addedAt" ? [desc(plugins.addedAt), desc(sql`rowid`)] : [plugins.id]))
		.limit(pageSize)
		.offset((page - 1) * pageSize)
		.all();
	return c.json({
		total,
		page,
		pageSize,
		plugins: rows.map((r) => ({
			...withoutCurrent(r),
			tags: r.tags ? JSON.parse(r.tags) : null,
			latest: latestFrom(r),
		})),
	} satisfies PluginListResponse);
});

api.get("/plugins/:id", async (c) => {
	const db = drizzle(c.env.DB);
	const id = c.req.param("id");
	const [plugin] = await db.select().from(plugins).where(eq(plugins.id, id)).all();
	if (!plugin) return c.json({ error: "not found" }, 404);
	const snapshots = await db
		.select()
		.from(pluginSnapshots)
		.where(eq(pluginSnapshots.pluginId, id))
		.orderBy(pluginSnapshots.snapshotAt)
		.all();
	const avg = (k: "views" | "copies" | "hearts") => {
		const vals = snapshots.map((s) => s[k]).filter((v): v is number => v != null);
		return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
	};
	return c.json({
		plugin: { ...withoutCurrent(plugin), tags: plugin.tags ? JSON.parse(plugin.tags) : null },
		snapshots,
		averages: { views: avg("views"), copies: avg("copies"), hearts: avg("hearts") },
	} satisfies PluginDetailResponse);
});

// ── counts over time ───────────────────────────────────────────────────────

function countsRoute(
	table: typeof plugins | typeof updateEvents | typeof verificationEvents,
	col: typeof plugins.addedAt | typeof updateEvents.occurredAt | typeof verificationEvents.occurredAt,
	extra: (q: Record<string, string>) => SQL[] = () => [],
) {
	return async (c: Context<{ Bindings: CloudflareBindings }>) => {
		const q = c.req.query();
		const db = drizzle(c.env.DB);
		const n = groupLen(q.groupBy);
		const { from, to } = dateRange(q);
		const bucket = sql<string>`substr(${col}, 1, ${n})`;
		const conds: SQL[] = [sql`${col} is not null`, ...extra(q)];
		if (from) conds.push(sql`${col} >= ${from}`);
		if (to) conds.push(sql`${col} <= ${to}`);
		const rows = await db
			.select({ bucket, count: count() })
			.from(table)
			.where(and(...conds))
			.groupBy(bucket)
			.orderBy(bucket)
			.all();
		return c.json({
			groupBy: q.groupBy ?? "month",
			from: from ?? null,
			to: to ?? null,
			points: rows,
		} satisfies StatsResponse);
	};
}

api.get("/stats/published", (c) => countsRoute(plugins, plugins.addedAt)(c));
api.get("/stats/updated", (c) => countsRoute(updateEvents, updateEvents.occurredAt)(c));
api.get("/stats/verified", (c) =>
	countsRoute(verificationEvents, verificationEvents.occurredAt, (q) =>
		q.toStatus ? [sql`${verificationEvents.toStatus} = ${q.toStatus}`] : [],
	)(c),
);

// ── aggregates ─────────────────────────────────────────────────────────────

/** Category counts + average current stats; one GROUP BY. Only plugins with
 * a snapshot count (brand-new light-poll insertions have no stats yet). */
api.get("/stats/categories", async (c) => {
	const db = drizzle(c.env.DB);
	const rows = await db
		.select({
			category: plugins.category,
			count: count(plugins.id),
			avgHearts: sql<number | null>`round(avg(${plugins.currentHearts}))`,
			avgViews: sql<number | null>`round(avg(${plugins.currentViews}))`,
			avgCopies: sql<number | null>`round(avg(${plugins.currentCopies}))`,
		})
		.from(plugins)
		.where(isNotNull(plugins.currentSnapshotAt))
		.groupBy(plugins.category)
		.orderBy(desc(count(plugins.id)))
		.all();
	return c.json({ rows } satisfies CategoriesResponse);
});

/** Verification-status + install-status breakdowns in one batch call. */
api.get("/stats/breakdown", async (c) => {
	const db = drizzle(c.env.DB);
	const [verification, installStatus, [{ total }]] = await db.batch([
		db
			.select({ status: plugins.currentVerificationStatus, count: count() })
			.from(plugins)
			.groupBy(plugins.currentVerificationStatus),
		db.select({ status: plugins.status, count: count() }).from(plugins).groupBy(plugins.status),
		db.select({ total: count() }).from(plugins),
	]);
	const verifiedCount = verification.find((r) => r.status === "verified")?.count ?? 0;
	return c.json({ verification, installStatus, totalPlugins: total, verifiedCount } satisfies BreakdownResponse);
});

/** Category × month activity from addedAt; feeds the heatmap. */
api.get("/stats/heatmap", async (c) => {
	const q = c.req.query();
	const db = drizzle(c.env.DB);
	const month = sql<string>`substr(${plugins.addedAt}, 1, 7)`;
	const conds: SQL[] = [sql`${plugins.addedAt} is not null`];
	if (q.from) conds.push(sql`${plugins.addedAt} >= ${q.from}`);
	if (q.to) conds.push(sql`${plugins.addedAt} <= ${q.to}`);
	const rows = await db
		.select({ category: plugins.category, month, count: count() })
		.from(plugins)
		.where(and(...conds))
		.groupBy(plugins.category, month)
		.orderBy(month)
		.all();
	return c.json({ points: rows } satisfies HeatmapResponse);
});

// ── leaderboards ───────────────────────────────────────────────────────────

const METRICS = {
	hearts: plugins.currentHearts,
	views: plugins.currentViews,
	copies: plugins.currentCopies,
} as const;

/** Max snapshot id per plugin at or before `before`; historical reads only. */
function latestMaxIds(db: ReturnType<typeof drizzle>, before: string) {
	return db
		.select({ id: max(pluginSnapshots.id) })
		.from(pluginSnapshots)
		.where(lte(pluginSnapshots.snapshotAt, before))
		.groupBy(pluginSnapshots.pluginId);
}

api.get("/leaderboard/trending", async (c) => {
	const q = c.req.query();
	const days = parseInt(q.days ?? "7", 10) || 7;
	const db = drizzle(c.env.DB);
	const cutoff = new Date(Date.now() - days * dayMs).toISOString();
	const [latest, old] = await Promise.all([
		db
			.select({
				pluginId: plugins.id,
				name: plugins.name,
				author: plugins.author,
				views: plugins.currentViews,
				copies: plugins.currentCopies,
				hearts: plugins.currentHearts,
			})
			.from(plugins)
			.where(isNotNull(plugins.currentSnapshotAt))
			.all(),
		db
			.select({
				pluginId: pluginSnapshots.pluginId,
				views: pluginSnapshots.views,
				copies: pluginSnapshots.copies,
				hearts: pluginSnapshots.hearts,
			})
			.from(pluginSnapshots)
			.where(inArray(pluginSnapshots.id, latestMaxIds(db, cutoff)))
			.all(),
	]);
	const oldBy = new Map(old.map((r) => [r.pluginId, r]));
	const deltas = [];
	for (const l of latest) {
		const o = oldBy.get(l.pluginId);
		if (!o) continue;
		const views = (l.views ?? 0) - (o.views ?? 0);
		const copies = (l.copies ?? 0) - (o.copies ?? 0);
		const hearts = (l.hearts ?? 0) - (o.hearts ?? 0);
		if (hearts > 0 || views > 0)
			deltas.push({ pluginId: l.pluginId, name: l.name, author: l.author, views, copies, hearts });
	}
	deltas.sort((a, b) => b.hearts - a.hearts);
	return c.json({ days, top: deltas.slice(0, 50) } satisfies TrendingResponse);
});

api.get("/leaderboard/:metric", async (c) => {
	const metric = c.req.param("metric");
	if (metric !== "copies_per_view" && !(metric in METRICS)) return c.json({ error: "unknown metric" }, 400);
	const db = drizzle(c.env.DB);
	const limit = Math.min(100, parseInt(c.req.query("limit") ?? "50", 10) || 50);
	const sparkPoints = Math.min(30, Math.max(0, parseInt(c.req.query("sparkPoints") ?? "0", 10) || 0));
	const score =
		metric === "copies_per_view"
			? sql<number | null>`cast(${plugins.currentCopies} as real) / nullif(${plugins.currentViews}, 0)`
			: METRICS[metric as keyof typeof METRICS];
	const rows = await db
		.select({
			pluginId: plugins.id,
			name: plugins.name,
			author: plugins.author,
			category: plugins.category,
			views: plugins.currentViews,
			copies: plugins.currentCopies,
			hearts: plugins.currentHearts,
			score,
		})
		.from(plugins)
		.where(isNotNull(plugins.currentSnapshotAt))
		.orderBy(desc(score))
		.limit(limit)
		.all();

	// Sparkline history for the top-N rows: one window-function query, last
	// `sparkPoints` snapshots per plugin (chronological in the response).
	const sparkBy = new Map<
		string,
		{ snapshotAt: string; views: number | null; copies: number | null; hearts: number | null }[]
	>();
	if (sparkPoints > 0 && rows.length) {
		// D1 caps SQLite bind variables (~100): a Top-100 IN list alone would
		// exceed it, so chunk the ids and run the chunks in one db.batch.
		const CHUNK = 90;
		// One chunk's sparkline query; every element of `batches` has this type.
		const sparkQuery = (chunk: string[]) => {
			const ranked = db
				.select({
					pluginId: pluginSnapshots.pluginId,
					snapshotAt: pluginSnapshots.snapshotAt,
					views: pluginSnapshots.views,
					copies: pluginSnapshots.copies,
					hearts: pluginSnapshots.hearts,
					rk: sql<number>`row_number() over (partition by ${pluginSnapshots.pluginId} order by ${pluginSnapshots.snapshotAt} desc)`.as(
						"rk",
					),
				})
				.from(pluginSnapshots)
				.where(inArray(pluginSnapshots.pluginId, chunk))
				.as("spark_ranked");
			return db
				.select({
					pluginId: ranked.pluginId,
					snapshotAt: ranked.snapshotAt,
					views: ranked.views,
					copies: ranked.copies,
					hearts: ranked.hearts,
				})
				.from(ranked)
				.where(sql`${ranked.rk} <= ${sparkPoints}`);
		};
		const batches: ReturnType<typeof sparkQuery>[] = [];
		for (let i = 0; i < rows.length; i += CHUNK) {
			batches.push(sparkQuery(rows.slice(i, i + CHUNK).map((r) => r.pluginId)));
		}
		const results = await db.batch(
			batches as [ReturnType<typeof sparkQuery>, ...ReturnType<typeof sparkQuery>[]],
		);
		for (const sparks of results) {
			for (const r of sparks) {
				const arr = sparkBy.get(r.pluginId) ?? [];
				arr.push({ snapshotAt: r.snapshotAt, views: r.views, copies: r.copies, hearts: r.hearts });
				sparkBy.set(r.pluginId, arr);
			}
		}
		for (const arr of sparkBy.values()) arr.sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt));
	}
	return c.json({
		metric,
		rows: rows.map((r) => ({ ...r, ...(sparkBy.get(r.pluginId) ? { spark: sparkBy.get(r.pluginId) } : {}) })),
	} satisfies LeaderboardResponse);
});

api.get("/authors/leaderboard", async (c) => {
	const db = drizzle(c.env.DB);
	const rows = await db
		.select({
			author: plugins.author,
			plugins: count(plugins.id),
			views: sql<number | null>`sum(${plugins.currentViews})`,
			copies: sql<number | null>`sum(${plugins.currentCopies})`,
			hearts: sql<number | null>`sum(${plugins.currentHearts})`,
		})
		.from(plugins)
		.where(isNotNull(plugins.currentSnapshotAt))
		.groupBy(plugins.author)
		.orderBy(desc(sql`sum(${plugins.currentHearts})`))
		.all();
	return c.json({ rows } satisfies AuthorsResponse);
});

api.get("/authors/:authorId", async (c) => {
	const db = drizzle(c.env.DB);
	const author = c.req.param("authorId");
	const rows = await db
		.select({
			id: plugins.id,
			name: plugins.name,
			category: plugins.category,
			kind: plugins.kind,
			status: plugins.status,
			repo: plugins.repo,
			views: plugins.currentViews,
			copies: plugins.currentCopies,
			hearts: plugins.currentHearts,
		})
		.from(plugins)
		.where(and(eq(plugins.author, author), isNotNull(plugins.currentSnapshotAt)))
		.orderBy(desc(plugins.currentHearts))
		.all();
	if (!rows.length) return c.json({ error: "not found" }, 404);
	const sum = (k: "views" | "copies" | "hearts") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
	return c.json({
		author,
		totals: { plugins: rows.length, views: sum("views"), copies: sum("copies"), hearts: sum("hearts") },
		plugins: rows,
	} satisfies AuthorDetailResponse);
});

// ── badges (shields.io endpoint schema, for external renderers) ────────────

const BADGE_COLORS = { hearts: "red", views: "blue", copies: "green", avg: "purple" } as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

api.get("/badges/:stat/:id", async (c) => {
	const stat = c.req.param("stat");
	const id = c.req.param("id");
	if (!isStat(stat)) return c.json({ error: "stat must be views, copies, or hearts" }, 400);
	const db = drizzle(c.env.DB);
	const value = await badgeValue(db, stat, id);
	if (value === null) return c.json({ error: "not found" }, 404);
	return c.json({
		schemaVersion: 1,
		label: c.req.query("label") ?? cap(stat),
		message: String(value),
		color: c.req.query("color") ?? BADGE_COLORS[stat],
	} satisfies BadgeResponse);
});

api.get("/badges/ranking/:stat/:id", async (c) => {
	const stat = c.req.param("stat");
	const id = c.req.param("id");
	if (!isRankStat(stat)) return c.json({ error: "stat must be views, copies, hearts, or avg" }, 400);
	const db = drizzle(c.env.DB);
	const rank = await badgeRank(db, stat, id);
	if (!rank) return c.json({ error: "not found" }, 404);
	return c.json({
		schemaVersion: 1,
		label: `${stat === "avg" ? "Avg" : cap(stat)} rank`,
		message: String(rank.rank),
		color: BADGE_COLORS[stat],
	} satisfies BadgeResponse);
});

// ── charts (JSON chart data for shieldcn's /chart/json.svg) ───────────────

const chartGroupBy = (raw: string | null, kind: string): "day" | "month" | "year" => {
	if (raw === "day" || raw === "year" || raw === "month") return raw;
	// Event charts are daily-activity curves (sparse data); published/total
	// are growth curves — month reads better. ?groupBy= overrides either.
	return kind === "updated" || kind === "verified" ? "day" : "month";
};
const chartMetric = (raw: string): "hearts" | "views" | "copies" | null =>
	raw === "hearts" || raw === "views" || raw === "copies" ? raw : null;
/** Optional `.json` suffix; `.svg` requests get a pointer to shieldcn. */
const stripChartExt = (s: string): string | null =>
	s.toLowerCase().endsWith(".svg")
		? null
		: s.toLowerCase().endsWith(".json")
			? s.slice(0, -5)
			: s;

const CHART_SVG_POINTER =
	"omastats doesn't render SVG — feed shieldcn's /chart/json.svg this URL without the .svg (and without .json; its fetcher rejects dot-suffixed URLs), e.g. ?url=<this without extension>&query=$.points[*].count&dateQuery=$.points[*].date";

api.get("/charts/omastats/:kind", async (c) => {
	const kind = stripChartExt(c.req.param("kind"));
	if (kind === null) return c.json({ error: CHART_SVG_POINTER }, 400);
	const db = drizzle(c.env.DB);
	const groupBy = chartGroupBy(c.req.query("groupBy") ?? null, kind);
	const series =
		kind === "published"
			? await omastatsPublished(db, groupBy)
			: kind === "updated"
				? await omastatsUpdated(db, groupBy)
				: kind === "verified"
					? await omastatsVerified(db, c.req.query("toStatus") ?? null, groupBy)
					: kind === "total"
						? await omastatsTotal(db, groupBy)
						: null;
	if (!series) return c.json({ error: "usage: /api/charts/omastats/{published|updated|verified|total}" }, 400);
	return c.json(series satisfies ChartSeriesResponse);
});

api.get("/charts/plugin/:id/:metric", async (c) => {
	const metricRaw = stripChartExt(c.req.param("metric"));
	if (metricRaw === null) return c.json({ error: CHART_SVG_POINTER }, 400);
	const metric = chartMetric(metricRaw);
	if (!metric) return c.json({ error: "metric must be hearts, views, or copies" }, 400);
	const series = await omastatsPlugin(drizzle(c.env.DB), c.req.param("id"), metric);
	if (!series) return c.json({ error: "not found" }, 404);
	return c.json(series satisfies ChartSeriesResponse);
});

api.get("/charts/author/:login/:metric", async (c) => {
	const metricRaw = stripChartExt(c.req.param("metric"));
	if (metricRaw === null) return c.json({ error: CHART_SVG_POINTER }, 400);
	const metric = chartMetric(metricRaw);
	if (!metric) return c.json({ error: "metric must be hearts, views, or copies" }, 400);
	const series = await omastatsAuthor(drizzle(c.env.DB), c.req.param("login"), metric);
	if (!series) return c.json({ error: "not found" }, 404);
	return c.json(series satisfies ChartSeriesResponse);
});

api.post("/admin/snapshot", async (c) => {
	if (c.req.header("x-admin-token") !== c.env.ADMIN_TOKEN) return c.json({ error: "unauthorized" }, 401);
	return c.json(await runSnapshot(c.env));
});

api.post("/admin/light-poll", async (c) => {
	if (c.req.header("x-admin-token") !== c.env.ADMIN_TOKEN) return c.json({ error: "unauthorized" }, 401);
	return c.json(await pollNewPlugins(c.env));
});

// ── health ─────────────────────────────────────────────────────────────────

api.get("/health", async (c) => {
	const db = drizzle(c.env.DB);
	const [snap] = await db
		.select({ at: max(pluginSnapshots.snapshotAt) })
		.from(pluginSnapshots)
		.all();
	const [{ pluginCount }] = await db.select({ pluginCount: count() }).from(plugins).all();
	const [{ snapshotCount }] = await db.select({ snapshotCount: count() }).from(pluginSnapshots).all();
	return c.json({ lastSnapshotAt: snap?.at ?? null, pluginCount, snapshotCount } satisfies HealthResponse);
});

api.get("/health/broken", async (c) => {
	const db = drizzle(c.env.DB);
	const staleBefore = new Date(Date.now() - 365 * dayMs).toISOString();
	const rows = await db
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
	return c.json({ staleDays: 365, plugins: rows } satisfies BrokenResponse);
});
