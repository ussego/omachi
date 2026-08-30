// Self-check for the badge value/rank logic against a real SQLite database.
// Run: bun src/lib/badges.selftest.ts

import { Database } from "bun:sqlite";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { plugins } from "../db/schema";
import { badgeRank, badgeValue } from "./badges";
import type { DrizzleDb } from "./db";

function assert(cond: unknown, msg: string) {
	if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// Mirror of src/db/schema.ts's plugins table so drizzle's insert (which
// writes every column) works. bun:sqlite runs the exact SQL drizzle
// generates for D1.
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

const FIXTURES = [
	{ id: "alice.one", author: "alice", views: 100, copies: 10, hearts: 5 },
	{ id: "alice.two", author: "alice", views: 200, copies: 20, hearts: 10 },
	{ id: "bob.one", author: "bob", views: 100, copies: 50, hearts: 1 },
	{ id: "solo", author: "solo", views: 50, copies: 5, hearts: 1 },
	{ id: "carol.one", author: "carol", views: null, copies: null, hearts: null },
] as const;

await db
	.insert(plugins)
	.values(
		FIXTURES.map((f) => ({
			id: f.id,
			author: f.author,
			currentViews: f.views,
			currentCopies: f.copies,
			currentHearts: f.hearts,
			currentSnapshotAt: "2026-08-30T00:00:00Z",
		})),
	)
	.run();

// values: plugin direct, author sum, bare-id plugin first, missing
assert((await badgeValue(db, "views", "alice.one")) === 100, "plugin views");
assert((await badgeValue(db, "views", "alice")) === 300, "author sum");
assert((await badgeValue(db, "views", "solo")) === 50, "bare-id plugin resolves to itself");
assert((await badgeValue(db, "views", "carol.one")) === null, "plugin without the stat is null");
assert((await badgeValue(db, "views", "nobody")) === null, "missing author is null");

// plugin ranks (views): 200 (1), 100+100 (2), 50 (4); carol excluded
assert((await badgeRank(db, "views", "alice.two"))?.rank === 1, "top plugin");
assert((await badgeRank(db, "views", "alice.one"))?.rank === 2, "tie shares rank");
assert((await badgeRank(db, "views", "bob.one"))?.rank === 2, "tie shares rank");
assert((await badgeRank(db, "views", "solo"))?.rank === 4, "bare-id plugin ranked as plugin");
assert((await badgeRank(db, "views", "solo"))?.total === 4, "total excludes null-stat plugins");
assert((await badgeRank(db, "views", "carol.one")) === null, "null-stat plugin has no rank");
assert((await badgeRank(db, "views", "nobody")) === null, "missing has no rank");

// author ranks (views): alice 300 (1), bob 100 (2), solo 50 (3); carol excluded
assert((await badgeRank(db, "views", "alice"))?.rank === 1, "top author");
assert((await badgeRank(db, "views", "alice"))?.total === 3, "author total");
assert((await badgeRank(db, "views", "bob"))?.rank === 2, "author rank");
assert((await badgeRank(db, "views", "bob"))?.value === 100, "author value");

// avg = mean of the three stats: plugin avg (200+20+10)/3 ranks 1st
assert((await badgeRank(db, "avg", "alice.two"))?.rank === 1, "avg rank");
assert((await badgeRank(db, "avg", "alice"))?.value === (300 + 30 + 15) / 3, "author avg value");

console.log("badges self-check ok");
