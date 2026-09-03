import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import { pluginRow, writeBatches } from "@/lib/snapshot";

export interface LightPollResult {
	inserted: number;
	total: number;
}

/**
 * Cheap poll (every 30 min): fetch catalog.json, insert rows for plugin IDs
 * not yet in `plugins`, so the live `count(*)` stays fresh between heavy
 * snapshot runs. No stats fetch, no snapshots, no full zod validation; the
 * heavy poll (every 8h) validates and upserts every row, overwriting anything
 * a malformed light-poll insert could have written.
 */
export async function pollNewPlugins(env: CloudflareBindings): Promise<LightPollResult> {
	const res = await fetch(env.CATALOG_URL);
	if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
	const data: unknown = await res.json();
	const list = (data as { plugins?: unknown })?.plugins;
	if (!Array.isArray(list)) throw new Error("catalog.plugins is not an array");

	const db = drizzle(env.DB);
	const existing = await db.select({ id: plugins.id }).from(plugins).all();
	const have = new Set(existing.map((r) => r.id));

	const stmts: BatchItem<"sqlite">[] = [];
	let total = 0;
	for (const p of list) {
		const row = p as Record<string, unknown>;
		if (typeof row?.id !== "string") continue; // cheap shape check, skip junk
		total++;
		if (have.has(row.id)) continue;
		stmts.push(db.insert(plugins).values([pluginRow(row as Parameters<typeof pluginRow>[0])]));
	}
	await writeBatches(db, stmts);
	return { inserted: stmts.length, total };
}
