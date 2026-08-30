/**
 * charts.selftest.ts
 *
 * Self-checks for the D1-backed omastats chart-data providers, exercised
 * against an in-memory bun:sqlite database (the same pattern as
 * `badges.selftest.ts`). Rendering is shieldcn's job; this only covers the
 * JSON series shape (`points[*].count` / `points[*].date`).
 *
 * Run: bun src/lib/charts/charts.selftest.ts
 */

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

import { plugins, pluginSnapshots, updateEvents, verificationEvents } from "../../db/schema";
import type { DrizzleDb } from "../db";
import {
	omastatsAuthor,
	omastatsPlugin,
	omastatsPublished,
	omastatsTotal,
	omastatsUpdated,
	omastatsVerified,
} from "./omastats";

function assert(cond: unknown, msg: string): asserts cond {
	if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// ── D1-backed omastats providers ──────────────────────────────────────────────
// Mirror src/db/schema.ts into an in-memory bun:sqlite database so Drizzle's
// generated SQL runs against the exact dialect drizzle-orm/d1 emits.
const db = drizzle(new Database(":memory:")) as unknown as DrizzleDb;
db.run(sql`CREATE TABLE plugins (
	id TEXT PRIMARY KEY,
	name TEXT,
	description TEXT,
	author TEXT,
	category TEXT,
	kind TEXT,
	license TEXT,
	tags TEXT,
	added_at TEXT,
	repo TEXT,
	stars INTEGER,
	install_available INTEGER,
	status TEXT,
	source_type TEXT,
	current_views INTEGER,
	current_copies INTEGER,
	current_hearts INTEGER,
	current_verification_status TEXT,
	current_version TEXT,
	current_repository_updated_at TEXT,
	current_upstream_check_status TEXT,
	current_snapshot_at TEXT
)`);
db.run(sql`CREATE TABLE plugin_snapshots (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	plugin_id TEXT NOT NULL,
	snapshot_at TEXT NOT NULL,
	views INTEGER,
	copies INTEGER,
	hearts INTEGER,
	verification_status TEXT,
	version TEXT,
	repository_updated_at TEXT,
	upstream_check_status TEXT
)`);
db.run(sql`CREATE TABLE update_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	plugin_id TEXT NOT NULL,
	occurred_at TEXT NOT NULL,
	from_version TEXT,
	to_version TEXT
)`);
db.run(sql`CREATE TABLE verification_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	plugin_id TEXT NOT NULL,
	occurred_at TEXT NOT NULL,
	from_status TEXT,
	to_status TEXT
)`);

// Fixtures: 2 plugins across 2 authors, several dates, several snapshots.
await db
	.insert(plugins)
	.values([
		{
			id: "alice.one",
			name: "P1",
			author: "alice",
			addedAt: "2026-05-15",
			currentHearts: 100,
			currentViews: 1000,
			currentCopies: 50,
			currentSnapshotAt: "2026-08-30T00:00:00Z",
		},
		{
			id: "alice.two",
			name: "P2",
			author: "alice",
			addedAt: "2026-06-20",
			currentHearts: 200,
			currentViews: 2000,
			currentCopies: 100,
			currentSnapshotAt: "2026-08-30T00:00:00Z",
		},
		{
			id: "bob.one",
			name: "P3",
			author: "bob",
			addedAt: "2026-07-10",
			currentHearts: 50,
			currentViews: 500,
			currentCopies: 25,
			currentSnapshotAt: "2026-08-30T00:00:00Z",
		},
	])
	.run();

await db
	.insert(pluginSnapshots)
	.values([
		{ pluginId: "alice.one", snapshotAt: "2026-08-01T00:00:00Z", hearts: 80, views: 800, copies: 40 },
		{ pluginId: "alice.one", snapshotAt: "2026-08-30T00:00:00Z", hearts: 100, views: 1000, copies: 50 },
		{ pluginId: "alice.two", snapshotAt: "2026-08-01T00:00:00Z", hearts: 150, views: 1500, copies: 75 },
		{ pluginId: "alice.two", snapshotAt: "2026-08-30T00:00:00Z", hearts: 200, views: 2000, copies: 100 },
		{ pluginId: "bob.one", snapshotAt: "2026-08-01T00:00:00Z", hearts: 30, views: 300, copies: 15 },
		{ pluginId: "bob.one", snapshotAt: "2026-08-30T00:00:00Z", hearts: 50, views: 500, copies: 25 },
	])
	.run();

await db
	.insert(updateEvents)
	.values([
		{ pluginId: "alice.one", occurredAt: "2026-06-01T00:00:00Z" },
		{ pluginId: "alice.two", occurredAt: "2026-07-15T00:00:00Z" },
		{ pluginId: "bob.one", occurredAt: "2026-08-20T00:00:00Z" },
	])
	.run();

await db
	.insert(verificationEvents)
	.values([
		{ pluginId: "alice.one", occurredAt: "2026-05-20T00:00:00Z", toStatus: "verified" },
		{ pluginId: "alice.two", occurredAt: "2026-06-25T00:00:00Z", toStatus: "verified" },
		{ pluginId: "bob.one", occurredAt: "2026-07-15T00:00:00Z", toStatus: "broken" },
	])
	.run();

// omastatsPublished: 3 plugins across May/Jun/Jul.
const pub = await omastatsPublished(db);
assert(pub.total === 3, "published total = 3");
assert(pub.points.length === 3, "published 3 monthly buckets");
assert(pub.points[0]?.count === 1 && pub.points[0]?.date === "2026-05-01", "May has 1 publish");
assert(pub.points[1]?.count === 1, "Jun has 1 publish");
assert(pub.points[2]?.count === 1, "Jul has 1 publish");

// omastatsTotal: cumulative running total — 1, 2, 3.
const total = await omastatsTotal(db);
assert(total.total === 3, "total plugins = 3");
assert(total.points.length === 3, "total 3 buckets");
assert(total.points[0]?.count === 1, "running 1 after May");
assert(total.points[1]?.count === 2, "running 2 after Jun");
assert(total.points[2]?.count === 3, "running 3 after Jul");

// omastatsUpdated: 3 events across months.
const upd = await omastatsUpdated(db);
assert(upd.total === 3, "updated total = 3");
assert(upd.points.length === 3, "updated 3 buckets");

// omastatsVerified: 2 verified, 1 broken — filtered by toStatus.
const allVer = await omastatsVerified(db, null);
assert(allVer.total === 3, "all verification events");
const onlyVerified = await omastatsVerified(db, "verified");
assert(onlyVerified.total === 2, "only verified = 2");
const onlyBroken = await omastatsVerified(db, "broken");
assert(onlyBroken.total === 1, "only broken = 1");

// omastatsPlugin: single plugin's history.
const pluginHearts = await omastatsPlugin(db, "alice.one", "hearts");
assert(pluginHearts !== null, "plugin exists");
assert(pluginHearts?.total === 100, "plugin latest hearts = 100");
assert(pluginHearts?.points.length === 2, "plugin 2 snapshot rows");
assert(pluginHearts?.points[0]?.count === 80, "first snapshot = 80");
assert(pluginHearts?.points[1]?.count === 100, "latest snapshot = 100");

// omastatsPlugin: missing plugin returns null (404 in the route).
const missing = await omastatsPlugin(db, "ghost.plugin", "hearts");
assert(missing === null, "missing plugin returns null");

// omastatsAuthor: sum across author's plugins at each timestamp.
const aliceHearts = await omastatsAuthor(db, "alice", "hearts");
assert(aliceHearts !== null, "alice exists");
assert(aliceHearts?.total === 300, "alice latest hearts sum = 100 + 200");
assert(aliceHearts?.points.length === 2, "alice 2 unique snapshot timestamps");
assert(aliceHearts?.points[0]?.count === 230, "alice at 2026-08-01 = 80 + 150");
assert(aliceHearts?.points[1]?.count === 300, "alice at 2026-08-30 = 100 + 200");

// omastatsAuthor: missing author returns null.
const ghost = await omastatsAuthor(db, "nobody", "hearts");
assert(ghost === null, "missing author returns null");

console.log("charts self-check ok");
