import { inArray, lte, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import type { z } from "zod";

import { pluginSnapshots, plugins, updateEvents, verificationEvents } from "@/db/schema";
import { type DrizzleDb, latestSnapshotsFor } from "@/lib/db";
import { type catalogPluginSchema, catalogSchema, statsSchema } from "@/lib/upstream";

export interface SnapshotResult {
	snapshots: number;
	verificationEvents: number;
	updateEvents: number;
}

type CatalogPlugin = z.infer<typeof catalogPluginSchema>;

/** plugin dimension row from catalog metadata (shared with the light poll). */
export function pluginRow(p: CatalogPlugin) {
	return {
		id: p.id,
		name: p.name ?? null,
		description: p.description ?? null,
		author: p.author ?? null,
		category: p.category ?? null,
		kind: p.kind ?? null,
		license: p.license ?? null,
		tags: p.tags ? JSON.stringify(p.tags) : null,
		addedAt: p.addedAt ?? null,
		repo: p.repo ?? null,
		stars: p.stars ?? null,
		installAvailable: p.installAvailable ?? null,
		status: p.status ?? null,
		sourceType: p.sourceType ?? null,
	};
}

/** one snapshot row (pure; self-checked in snapshot.selftest.ts). */
export function buildSnapshotRow(
	p: CatalogPlugin,
	stat: { views?: number | null; copies?: number | null; hearts?: number | null },
	snapshotAt: string,
) {
	return {
		pluginId: p.id,
		snapshotAt,
		views: stat.views ?? null,
		copies: stat.copies ?? null,
		hearts: stat.hearts ?? null,
		verificationStatus: p.verificationStatus ?? null,
		version: p.version ?? null,
		repositoryUpdatedAt: p.repositoryUpdatedAt ?? null,
		upstreamCheckStatus: p.upstreamCheckStatus ?? null,
	};
}

/** plugin row + denormalized current* fields from the same poll's snapshot. */
export function pluginRowWithCurrent(p: CatalogPlugin, s: ReturnType<typeof buildSnapshotRow>) {
	return {
		...pluginRow(p),
		currentViews: s.views,
		currentCopies: s.copies,
		currentHearts: s.hearts,
		currentVerificationStatus: s.verificationStatus,
		currentVersion: s.version,
		currentRepositoryUpdatedAt: s.repositoryUpdatedAt,
		currentUpstreamCheckStatus: s.upstreamCheckStatus,
		currentSnapshotAt: s.snapshotAt,
	};
}

/**
 * Poll both upstream endpoints, upsert plugin metadata + current stats, append
 * one snapshot row per plugin, log verification/update events by diffing
 * against each plugin's previous snapshot, and prune old snapshots.
 * Called from the scheduled() handler.
 *
 * D1 limits: 100 bound parameters per statement, 100 statements per batch.
 */
export async function runSnapshot(env: CloudflareBindings): Promise<SnapshotResult> {
	const [catalogRes, statsRes] = await Promise.all([fetch(env.CATALOG_URL), fetch(env.STATS_URL)]);
	if (!catalogRes.ok) throw new Error(`catalog fetch failed: ${catalogRes.status}`);
	if (!statsRes.ok) throw new Error(`stats fetch failed: ${statsRes.status}`);
	const catalog = catalogSchema.parse(await catalogRes.json());
	const stats = statsSchema.parse(await statsRes.json());

	const db = drizzle(env.DB);
	const snapshotAt = new Date().toISOString();

	// 1. Build snapshot rows first; the plugin upsert carries them as current*.
	const snapshotRows = catalog.plugins.map((p) => buildSnapshotRow(p, stats.plugins[p.id] ?? {}, snapshotAt));

	// 2. Upsert plugin dimension rows: metadata + denormalized current stats,
	//    in a single statement per plugin (metadata rarely changes, stats always).
	const upserts: BatchItem<"sqlite">[] = [];
	catalog.plugins.forEach((p, i) => {
		const row = pluginRowWithCurrent(p, snapshotRows[i]);
		upserts.push(
			db
				.insert(plugins)
				.values([row])
				.onConflictDoUpdate({
					target: plugins.id,
					set: {
						name: sql`excluded.name`,
						description: sql`excluded.description`,
						author: sql`excluded.author`,
						category: sql`excluded.category`,
						kind: sql`excluded.kind`,
						license: sql`excluded.license`,
						tags: sql`excluded.tags`,
						addedAt: sql`excluded.added_at`,
						repo: sql`excluded.repo`,
						stars: sql`excluded.stars`,
						installAvailable: sql`excluded.install_available`,
						status: sql`excluded.status`,
						sourceType: sql`excluded.source_type`,
						currentViews: sql`excluded.current_views`,
						currentCopies: sql`excluded.current_copies`,
						currentHearts: sql`excluded.current_hearts`,
						currentVerificationStatus: sql`excluded.current_verification_status`,
						currentVersion: sql`excluded.current_version`,
						currentRepositoryUpdatedAt: sql`excluded.current_repository_updated_at`,
						currentUpstreamCheckStatus: sql`excluded.current_upstream_check_status`,
						currentSnapshotAt: sql`excluded.current_snapshot_at`,
					},
				}),
		);
	});
	await writeBatches(db, upserts);

	// 3. Latest snapshot per plugin, to diff against.
	const prev = await latestSnapshotsFor(
		db,
		catalog.plugins.map((p) => p.id),
	);

	// 4. Diff snapshots against the previous one → verification/update events.
	const verifyRows: { pluginId: string; occurredAt: string; fromStatus: string | null; toStatus: string | null }[] =
		[];
	const updateRows: { pluginId: string; occurredAt: string; fromVersion: string | null; toVersion: string | null }[] =
		[];
	catalog.plugins.forEach((p, i) => {
		const snapshot = snapshotRows[i];
		const last = prev.get(p.id);
		if (!last) return;
		if (last.verificationStatus !== snapshot.verificationStatus) {
			verifyRows.push({
				pluginId: p.id,
				occurredAt: snapshotAt,
				fromStatus: last.verificationStatus,
				toStatus: snapshot.verificationStatus,
			});
		}
		if (last.version !== snapshot.version) {
			updateRows.push({
				pluginId: p.id,
				occurredAt: snapshotAt,
				fromVersion: last.version,
				toVersion: snapshot.version,
			});
		}
	});

	// 5. Write snapshots + events, single-row statements in batches (D1 caps
	//    bound params per statement, so one row each).
	const snapshots: BatchItem<"sqlite">[] = [];
	for (const row of snapshotRows) snapshots.push(db.insert(pluginSnapshots).values([row]));
	const events: BatchItem<"sqlite">[] = [];
	for (const row of verifyRows) events.push(db.insert(verificationEvents).values([row]));
	for (const row of updateRows) events.push(db.insert(updateEvents).values([row]));
	await writeBatches(db, snapshots);
	await writeBatches(db, events);

	// 6. Retention: keep raw snapshots for 90 days (covers range=90d), prune
	//    older rows in bounded chunks so no single run deletes a huge swath.
	const cutoff = new Date(Date.now() - 90 * 864e5).toISOString();
	await db
		.delete(pluginSnapshots)
		.where(
			inArray(
				pluginSnapshots.id,
				db
					.select({ id: pluginSnapshots.id })
					.from(pluginSnapshots)
					.where(lte(pluginSnapshots.snapshotAt, cutoff))
					.limit(5000),
			),
		)
		.run();

	return {
		snapshots: snapshotRows.length,
		verificationEvents: verifyRows.length,
		updateEvents: updateRows.length,
	};
}

/** Execute statements in batches of 100 (D1 batch limit). */
export async function writeBatches(db: DrizzleDb, stmts: BatchItem<"sqlite">[]) {
	if (!stmts.length) return;
	for (let i = 0; i < stmts.length; i += 100) {
		await db.batch(stmts.slice(i, i + 100) as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
	}
}
