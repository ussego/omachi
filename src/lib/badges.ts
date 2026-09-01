import { and, count, eq, isNotNull, type SQL, sql } from "drizzle-orm";

import { plugins } from "@/db/schema";
import type { DrizzleDb } from "@/lib/db";

const STATS = ["views", "copies", "hearts"] as const;
export type Stat = (typeof STATS)[number];
const RANK_STATS = [...STATS, "avg"] as const;
export type RankStat = (typeof STATS)[number] | "avg";

export const isStat = (v: string): v is Stat => (STATS as readonly string[]).includes(v);
export const isRankStat = (v: string): v is RankStat => (RANK_STATS as readonly string[]).includes(v);

const COL = {
	views: plugins.currentViews,
	copies: plugins.currentCopies,
	hearts: plugins.currentHearts,
} as const;

/** Per-plugin score: the stat value, or the mean of the three for avg. */
const score = (stat: RankStat) =>
	stat === "avg"
		? sql<number>`(coalesce(${plugins.currentViews}, 0) + coalesce(${plugins.currentCopies}, 0) + coalesce(${plugins.currentHearts}, 0)) / 3.0`
		: sql<number>`${COL[stat]}`;

/** Per-author score: sum of the stat, or the mean of the three sums for avg. */
const authorScore = (stat: RankStat) =>
	stat === "avg"
		? sql<number>`(coalesce(sum(${plugins.currentViews}), 0) + coalesce(sum(${plugins.currentCopies}), 0) + coalesce(sum(${plugins.currentHearts}), 0)) / 3.0`
		: sql<number>`coalesce(sum(${COL[stat]}), 0)`;

/** A plugin is ranked for a stat only if it has a value for it (avg: any snapshot). */
const hasScore = (stat: RankStat): SQL | undefined =>
	stat === "avg"
		? isNotNull(plugins.currentSnapshotAt)
		: and(isNotNull(plugins.currentSnapshotAt), isNotNull(COL[stat]));

/**
 * Badge value for a stat. Dotted id = the plugin; bare id = the plugin of
 * that exact id if one exists (bare-id plugins count as their own author),
 * else the sum across the author's snapshot'd plugins. Null when nothing
 * matches, so the route can 404.
 */
export async function badgeValue(db: DrizzleDb, stat: Stat, id: string): Promise<number | null> {
	if (id.includes(".")) {
		const [row] = await db.select({ v: COL[stat] }).from(plugins).where(eq(plugins.id, id)).all();
		return row?.v ?? null;
	}
	const [plugin] = await db.select({ v: COL[stat] }).from(plugins).where(eq(plugins.id, id)).all();
	if (plugin) return plugin.v ?? null;
	const [author] = await db
		.select({ n: count(), v: authorScore(stat).as("v") })
		.from(plugins)
		.where(and(eq(plugins.author, id), isNotNull(plugins.currentSnapshotAt)))
		.all();
	return author && author.n > 0 ? author.v : null;
}

export type BadgeRank = { rank: number; total: number; value: number };

/**
 * Competition rank (1 = highest, ties share a place) among plugins for a
 * dotted id, among authors for a bare id (plugin of that exact id wins).
 */
export async function badgeRank(db: DrizzleDb, stat: RankStat, id: string): Promise<BadgeRank | null> {
	if (id.includes(".")) return rankPlugin(db, stat, id);
	const [plugin] = await db.select({ id: plugins.id }).from(plugins).where(eq(plugins.id, id)).all();
	return plugin ? rankPlugin(db, stat, id) : rankAuthor(db, stat, id);
}

async function rankPlugin(db: DrizzleDb, stat: RankStat, id: string): Promise<BadgeRank | null> {
	const [target] = await db
		.select({ value: score(stat).as("value") })
		.from(plugins)
		.where(and(eq(plugins.id, id), hasScore(stat)))
		.all();
	if (!target) return null;
	const [ahead] = await db
		.select({ n: count() })
		.from(plugins)
		.where(and(hasScore(stat), sql`${score(stat)} > ${target.value}`))
		.all();
	const [total] = await db.select({ n: count() }).from(plugins).where(hasScore(stat)).all();
	return { rank: ahead.n + 1, total: total.n, value: target.value };
}

async function rankAuthor(db: DrizzleDb, stat: RankStat, id: string): Promise<BadgeRank | null> {
	const [mine] = await db
		.select({ n: count(), s: authorScore(stat).as("s") })
		.from(plugins)
		.where(and(eq(plugins.author, id), isNotNull(plugins.currentSnapshotAt)))
		.all();
	if (!mine || mine.n === 0) return null;
	const ahead = db
		.select({ author: plugins.author })
		.from(plugins)
		.where(hasScore(stat))
		.groupBy(plugins.author)
		.having(sql`${authorScore(stat)} > ${mine.s}`)
		.as("ahead");
	const ranked = db
		.select({ author: plugins.author })
		.from(plugins)
		.where(hasScore(stat))
		.groupBy(plugins.author)
		.as("ranked");
	const [aheadCount] = await db.select({ n: count() }).from(ahead).all();
	const [totalCount] = await db.select({ n: count() }).from(ranked).all();
	return { rank: aheadCount.n + 1, total: totalCount.n, value: mine.s };
}
