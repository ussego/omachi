import { describe, expect, it } from "bun:test";

import { buildEventRows, buildSnapshotRow, pluginRow, pluginRowWithCurrent, type PrevState } from "@/lib/snapshot";

describe("snapshot mappings", () => {
	const plugin = {
		id: "plugin-1",
		name: "P1",
		author: "a",
		version: "2.0",
		verificationStatus: "verified",
		repositoryUpdatedAt: "2026-01-01T00:00:00Z",
		upstreamCheckStatus: "ok",
	};

	it("maps snapshot values into current plugin state", () => {
		const snapshot = buildSnapshotRow(plugin, { views: 5, copies: 2, hearts: 1 }, "2026-06-01T00:00:00.000Z");
		expect(snapshot.views).toBe(5);
		expect(snapshot.hearts).toBe(1);
		expect(snapshot.snapshotAt).toBe("2026-06-01T00:00:00.000Z");

		const row = pluginRowWithCurrent(plugin, snapshot);
		expect(row.id).toBe("plugin-1");
		expect(row.currentViews).toBe(5);
		expect(row.currentCopies).toBe(2);
		expect(row.currentHearts).toBe(1);
		expect(row.currentVerificationStatus).toBe("verified");
		expect(row.currentVersion).toBe("2.0");
		expect(row.currentRepositoryUpdatedAt).toBe("2026-01-01T00:00:00Z");
		expect(row.currentUpstreamCheckStatus).toBe("ok");
		expect(row.currentSnapshotAt).toBe("2026-06-01T00:00:00.000Z");

		expect(pluginRow(plugin).name).toBe("P1");
		expect(pluginRow(plugin).tags).toBeNull();
	});

	it("preserves null statistics", () => {
		const snapshot = buildSnapshotRow(
			plugin,
			{ views: null, copies: null, hearts: null },
			"2026-06-02T00:00:00.000Z",
		);

		expect(snapshot.views).toBeNull();
		expect(pluginRowWithCurrent(plugin, snapshot).currentHearts).toBeNull();
	});
});

describe("buildEventRows", () => {
	const at = "2026-06-01T00:00:00.000Z";
	const row = (id: string, verificationStatus: string | null, version: string | null) =>
		buildSnapshotRow({ id, name: id, verificationStatus, version } as never, {}, at);

	it("emits no events for plugins without previous state (first snapshot)", () => {
		const events = buildEventRows(new Map(), [row("p1", "verified", "1.0")], at);
		expect(events.verifyRows).toEqual([]);
		expect(events.updateRows).toEqual([]);
	});

	it("emits verification and update events on change", () => {
		const prev: PrevState = new Map([["p1", { verificationStatus: "unverified", version: "1.0" }]]);
		const events = buildEventRows(prev, [row("p1", "verified", "2.0")], at);
		expect(events.verifyRows).toEqual([{ pluginId: "p1", occurredAt: at, fromStatus: "unverified", toStatus: "verified" }]);
		expect(events.updateRows).toEqual([{ pluginId: "p1", occurredAt: at, fromVersion: "1.0", toVersion: "2.0" }]);
	});

	it("stays silent when nothing changed", () => {
		const prev: PrevState = new Map([["p1", { verificationStatus: "verified", version: "1.0" }]]);
		const events = buildEventRows(prev, [row("p1", "verified", "1.0")], at);
		expect(events.verifyRows).toEqual([]);
		expect(events.updateRows).toEqual([]);
	});

	it("emits an event when a value becomes null", () => {
		const prev: PrevState = new Map([["p1", { verificationStatus: "verified", version: "1.0" }]]);
		const events = buildEventRows(prev, [row("p1", null, "1.0")], at);
		expect(events.verifyRows).toEqual([{ pluginId: "p1", occurredAt: at, fromStatus: "verified", toStatus: null }]);
		expect(events.updateRows).toEqual([]);
	});
});
