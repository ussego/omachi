import { sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";

import { pluginRelations, plugins } from "@/db/schema";
import { writeBatches } from "@/lib/snapshot";

export interface ExplorerPollResult {
	nodes: number;
	upserted: number;
}

export interface ExplorerRelationRow {
	pluginId: string;
	related: string | null;
	cluster: string | null;
	influence: number | null;
	refreshedAt: string;
}

interface RelatedEntry {
	pluginId: string;
	similarity: number;
}

/**
 * Map an explorer-data.json payload to plugin_relations rows (pure; covered
 * by explorer.test.ts). Neighbor indices resolve through the payload's node
 * index map, and any plugin id not in `knownIds` is dropped so related links
 * can never 404. Returns null when the payload has no usable `nodes` array —
 * callers must then skip the write entirely, never wipe yesterday's rows.
 */
export function relationsFromExplorer(
	data: unknown,
	knownIds: ReadonlySet<string>,
	refreshedAt: string,
): { rows: ExplorerRelationRow[]; nodes: number } | null {
	const payload = data as { nodes?: unknown; clusters?: unknown };
	if (!payload || typeof payload !== "object" || !Array.isArray(payload.nodes) || !payload.nodes.length) {
		return null;
	}

	const clusterLabels = new Map<string, string>();
	if (Array.isArray(payload.clusters)) {
		for (const raw of payload.clusters) {
			const cluster = raw as { id?: unknown; label?: unknown };
			if (typeof cluster?.id === "string" && typeof cluster.label === "string") {
				clusterLabels.set(cluster.id, cluster.label);
			}
		}
	}

	// The payload cross-references plugins by numeric node index, not by id.
	const idByIndex = new Map<number, string>();
	payload.nodes.forEach((raw, position) => {
		const node = raw as { index?: unknown; id?: unknown };
		if (typeof node?.id !== "string") return;
		const index = typeof node.index === "number" ? node.index : position;
		if (!idByIndex.has(index)) idByIndex.set(index, node.id);
	});

	const rows: ExplorerRelationRow[] = [];
	let nodes = 0;
	for (const raw of payload.nodes) {
		const node = raw as { id?: unknown; cluster?: unknown; influence?: unknown; neighbors?: unknown };
		if (typeof node?.id !== "string" || !knownIds.has(node.id)) continue;
		nodes++;

		const related: RelatedEntry[] = [];
		if (Array.isArray(node.neighbors)) {
			for (const neighborRaw of node.neighbors) {
				const neighbor = neighborRaw as { index?: unknown; similarity?: unknown };
				if (typeof neighbor?.index !== "number" || typeof neighbor.similarity !== "number") continue;
				if (!Number.isFinite(neighbor.similarity)) continue;
				const pluginId = idByIndex.get(neighbor.index);
				if (!pluginId || pluginId === node.id || !knownIds.has(pluginId)) continue;
				related.push({ pluginId, similarity: Math.round(neighbor.similarity * 1000) / 1000 });
			}
		}
		related.sort((a, b) => b.similarity - a.similarity);

		rows.push({
			pluginId: node.id,
			related: related.length ? JSON.stringify(related) : null,
			cluster:
				typeof node.cluster === "string" && node.cluster
					? (clusterLabels.get(node.cluster) ?? node.cluster)
					: null,
			influence: typeof node.influence === "number" && Number.isFinite(node.influence) ? node.influence : null,
			refreshedAt,
		});
	}
	return { rows, nodes };
}

/**
 * Daily poll: fetch explorer-data.json and upsert one plugin_relations row
 * per community plugin known to the catalog. No full zod validation — shape
 * checks only, like the light poll — and nothing is written when the payload
 * is unusable (the upstream occasionally answers with a non-JSON error body).
 * Multi-row statements of ~16 rows keep bound params under D1's per-statement
 * cap, so the whole sync is two batch calls.
 */
export async function pollExplorerRelations(env: CloudflareBindings): Promise<ExplorerPollResult> {
	const res = await fetch(env.EXPLORER_URL);
	if (!res.ok) throw new Error(`explorer fetch failed: ${res.status}`);
	const data: unknown = await res.json();

	const db = drizzle(env.DB);
	const existing = await db.select({ id: plugins.id }).from(plugins).all();
	const mapped = relationsFromExplorer(data, new Set(existing.map((row) => row.id)), new Date().toISOString());
	if (!mapped) throw new Error("explorer payload has no usable nodes; skipping write");

	const stmts: BatchItem<"sqlite">[] = [];
	for (let i = 0; i < mapped.rows.length; i += 16) {
		const chunk = mapped.rows.slice(i, i + 16);
		stmts.push(
			db
				.insert(pluginRelations)
				.values(chunk)
				.onConflictDoUpdate({
					target: pluginRelations.pluginId,
					set: {
						related: sql`excluded.related`,
						cluster: sql`excluded.cluster`,
						influence: sql`excluded.influence`,
						refreshedAt: sql`excluded.refreshed_at`,
					},
				}),
		);
	}
	await writeBatches(db, stmts);
	return { nodes: mapped.nodes, upserted: mapped.rows.length };
}
