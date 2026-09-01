import { inArray, max } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/d1";

import { pluginSnapshots } from "../db/schema";

export const CHUNK = 100; // D1 batches cap at 100 statements

export type DrizzleDb = ReturnType<typeof drizzle>;

export async function batch<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
	for (let i = 0; i < rows.length; i += size) {
		await fn(rows.slice(i, i + size));
	}
}

/**
 * Map of pluginId -> most recent snapshot row, for the given plugin ids.
 * Used by the poller (diffing) and by API list endpoints (latest stats).
 */
export async function latestSnapshotsFor(db: DrizzleDb, pluginIds: string[]) {
	const map = new Map<string, typeof pluginSnapshots.$inferSelect>();
	await batch(pluginIds, CHUNK, async (chunk) => {
		const maxIds = db
			.select({ id: max(pluginSnapshots.id) })
			.from(pluginSnapshots)
			.where(inArray(pluginSnapshots.pluginId, chunk))
			.groupBy(pluginSnapshots.pluginId);
		const rows = await db.select().from(pluginSnapshots).where(inArray(pluginSnapshots.id, maxIds)).all();
		for (const row of rows) map.set(row.pluginId, row);
	});
	return map;
}
