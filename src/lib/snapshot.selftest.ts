// Self-check for the snapshot -> current* mapping. Run: bun src/lib/snapshot.selftest.ts
function assert(cond: unknown, msg: string) {
	if (!cond) throw new Error(`assertion failed: ${msg}`);
}

import { buildSnapshotRow, pluginRow, pluginRowWithCurrent } from "./snapshot";

const p = {
	id: "plugin-1",
	name: "P1",
	author: "a",
	version: "2.0",
	verificationStatus: "verified",
	repositoryUpdatedAt: "2026-01-01T00:00:00Z",
	upstreamCheckStatus: "ok",
};

const s = buildSnapshotRow(p, { views: 5, copies: 2, hearts: 1 }, "2026-06-01T00:00:00.000Z");
assert(s.views === 5, "views");
assert(s.hearts === 1, "hearts");
assert(s.snapshotAt === "2026-06-01T00:00:00.000Z", "snapshotAt");

const row = pluginRowWithCurrent(p, s);
assert(row.id === "plugin-1", "id");
assert(row.currentViews === 5, "currentViews");
assert(row.currentCopies === 2, "currentCopies");
assert(row.currentHearts === 1, "currentHearts");
assert(row.currentVerificationStatus === "verified", "currentVerificationStatus");
assert(row.currentVersion === "2.0", "currentVersion");
assert(row.currentRepositoryUpdatedAt === "2026-01-01T00:00:00Z", "currentRepositoryUpdatedAt");
assert(row.currentUpstreamCheckStatus === "ok", "currentUpstreamCheckStatus");
assert(row.currentSnapshotAt === "2026-06-01T00:00:00.000Z", "currentSnapshotAt");
// metadata still mapped
assert(pluginRow(p).name === "P1", "name");
assert(pluginRow(p).tags === null, "tags");

// null stats stay null, not 0
const s2 = buildSnapshotRow(p, { views: null, copies: null, hearts: null }, "2026-06-02T00:00:00.000Z");
assert(s2.views === null, "null views");
assert(pluginRowWithCurrent(p, s2).currentHearts === null, "null currentHearts");

console.log("snapshot self-check ok");
