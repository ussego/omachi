import { inArray, isNotNull, lte, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import type { z } from "zod";

import { meta, pluginSnapshots, plugins, updateEvents, verificationEvents } from "@/db/schema";
import type { DrizzleDb } from "@/lib/db";
import { type catalogPluginSchema, catalogSchema, statsSchema } from "@/lib/upstream";

export interface SnapshotResult {
	snapshots: number;
	verificationEvents: number;
	updateEvents: number;
}

type CatalogPlugin = z.infer<typeof catalogPluginSchema>;

const MAX_FETCH_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30_000;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429]);

type FeedFetch = (input: string, init?: RequestInit) => Promise<Response>;

interface FetchValidatedFeedOptions {
	fetch?: FeedFetch;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
	timeoutMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRetryableStatus(status: number) {
	return RETRYABLE_STATUSES.has(status) || status >= 500;
}

function retryDelayMs(value: string | null, now: () => number) {
	if (!value) return DEFAULT_RETRY_DELAY_MS;
	const seconds = Number(value);
	const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now();
	if (!Number.isFinite(requested)) return DEFAULT_RETRY_DELAY_MS;
	return Math.min(Math.max(requested, 0), MAX_RETRY_DELAY_MS);
}

function errorMessage(err: unknown) {
	return err instanceof Error && err.message ? `${err.name}: ${err.message}` : String(err);
}

function isTimeoutError(err: unknown) {
	return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

/** Fetch and validate an upstream feed, retrying only failures likely to be transient. */
export async function fetchValidatedFeed<T>(
	label: string,
	url: string,
	schema: z.ZodType<T>,
	options: FetchValidatedFeedOptions = {},
): Promise<T> {
	const fetchFeed = options.fetch ?? fetch;
	const wait = options.sleep ?? sleep;
	const now = options.now ?? Date.now;
	const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

	for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
		let response: Response;
		try {
			response = await fetchFeed(url, { signal: AbortSignal.timeout(timeoutMs) });
		} catch (err) {
			if (attempt < MAX_FETCH_ATTEMPTS) {
				await wait(DEFAULT_RETRY_DELAY_MS);
				continue;
			}
			const category = isTimeoutError(err) ? "timed out" : "request failed";
			throw new Error(`${label} ${category} after ${attempt} attempts: ${errorMessage(err)}`, { cause: err });
		}

		if (!response.ok) {
			await response.body?.cancel().catch(() => undefined);
			if (attempt < MAX_FETCH_ATTEMPTS && isRetryableStatus(response.status)) {
				await wait(retryDelayMs(response.headers.get("retry-after"), now));
				continue;
			}
			throw new Error(
				`${label} fetch failed after ${attempt} attempt${attempt === 1 ? "" : "s"}: HTTP ${response.status}`,
			);
		}

		let body: unknown;
		try {
			body = await response.json();
		} catch (err) {
			if (attempt < MAX_FETCH_ATTEMPTS) {
				await wait(DEFAULT_RETRY_DELAY_MS);
				continue;
			}
			throw new Error(`${label} JSON parse failed after ${attempt} attempts: ${errorMessage(err)}`, {
				cause: err,
			});
		}

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			throw new Error(`${label} validation failed on attempt ${attempt}: ${parsed.error.message}`, {
				cause: parsed.error,
			});
		}
		return parsed.data;
	}

	throw new Error(`${label} fetch failed`);
}

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

/** one snapshot row (pure; covered by snapshot.test.ts). */
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

/** Previous verification/version state per plugin, keyed by plugin id. */
export type PrevState = Map<string, { verificationStatus: string | null; version: string | null }>;

/** Diff snapshots against the previous state (pure; covered by snapshot.test.ts). */
export function buildEventRows(
	prev: PrevState,
	snapshotRows: ReturnType<typeof buildSnapshotRow>[],
	snapshotAt: string,
) {
	const verifyRows: { pluginId: string; occurredAt: string; fromStatus: string | null; toStatus: string | null }[] =
		[];
	const updateRows: { pluginId: string; occurredAt: string; fromVersion: string | null; toVersion: string | null }[] =
		[];
	for (const snapshot of snapshotRows) {
		const last = prev.get(snapshot.pluginId);
		if (!last) continue;
		if (last.verificationStatus !== snapshot.verificationStatus) {
			verifyRows.push({
				pluginId: snapshot.pluginId,
				occurredAt: snapshotAt,
				fromStatus: last.verificationStatus,
				toStatus: snapshot.verificationStatus,
			});
		}
		if (last.version !== snapshot.version) {
			updateRows.push({
				pluginId: snapshot.pluginId,
				occurredAt: snapshotAt,
				fromVersion: last.version,
				toVersion: snapshot.version,
			});
		}
	}
	return { verifyRows, updateRows };
}

/**
 * Poll both upstream endpoints, upsert plugin metadata + current stats, append
 * one snapshot row per plugin, log verification/update events by diffing
 * against each plugin's previous mirror state, and prune old snapshots.
 * Called by the admin snapshot Server Route.
 *
 * D1 limits: 100 bound parameters per statement, 100 statements per batch.
 */
export async function runSnapshot(env: CloudflareBindings): Promise<SnapshotResult> {
	const [catalog, stats] = await Promise.all([
		fetchValidatedFeed("catalog", env.CATALOG_URL, catalogSchema),
		fetchValidatedFeed("stats", env.STATS_URL, statsSchema),
	]);

	const db = drizzle(env.DB);
	const snapshotAt = new Date().toISOString();

	// Running total of plugin_snapshots rows, maintained so /api/health reads
	// one meta row instead of full-scanning the table. Seeded by migration.
	const bumpCounter = (delta: number) =>
		db
			.insert(meta)
			.values({ key: "snapshot_count", value: delta })
			.onConflictDoUpdate({ target: meta.key, set: { value: sql`${meta.value} + ${delta}` } });

	// 1. Build snapshot rows first; the plugin upsert carries them as current*.
	const snapshotRows = catalog.plugins.map((p) => buildSnapshotRow(p, stats.plugins[p.id] ?? {}, snapshotAt));

	// 2. Previous verification/version state per plugin, read from the mirror
	//    BEFORE the upsert below overwrites it. One statement replaces the old
	//    chunked max(id)-per-plugin scan of plugin_snapshots.
	const prevRows = await db
		.select({
			id: plugins.id,
			verificationStatus: plugins.currentVerificationStatus,
			version: plugins.currentVersion,
		})
		.from(plugins)
		.where(isNotNull(plugins.currentSnapshotAt))
		.all();
	const prev: PrevState = new Map(
		prevRows.map((r) => [r.id, { verificationStatus: r.verificationStatus, version: r.version }]),
	);

	// 3. Upsert plugin dimension rows: metadata + denormalized current stats,
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

	// 4. Diff snapshots against the mirror state → verification/update events.
	const { verifyRows, updateRows } = buildEventRows(prev, snapshotRows, snapshotAt);

	// 5. Write snapshots + events, single-row statements in batches (D1 caps
	//    bound params per statement, so one row each). The counter increment
	//    rides the snapshot batches, so no extra batch call is spent.
	const snapshots: BatchItem<"sqlite">[] = [];
	for (const row of snapshotRows) snapshots.push(db.insert(pluginSnapshots).values([row]));
	snapshots.push(bumpCounter(snapshotRows.length));
	const events: BatchItem<"sqlite">[] = [];
	for (const row of verifyRows) events.push(db.insert(verificationEvents).values([row]));
	for (const row of updateRows) events.push(db.insert(updateEvents).values([row]));
	await writeBatches(db, snapshots);
	await writeBatches(db, events);

	// 6. Retention: keep raw snapshots for 90 days (covers range=90d), prune
	//    older rows in bounded chunks so no single run deletes a huge swath.
	//    The counter tracks the deletions so it stays the true row total.
	const cutoff = new Date(Date.now() - 90 * 864e5).toISOString();
	const pruned = await db
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
		.run()
		.then((res) => res.meta.changes ?? 0);
	if (pruned > 0) await bumpCounter(-pruned).run();

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
