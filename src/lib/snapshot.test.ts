import { describe, expect, it } from "bun:test";
import { z } from "zod";

import {
	buildEventRows,
	buildSnapshotRow,
	fetchValidatedFeed,
	type PrevState,
	pluginRow,
	pluginRowWithCurrent,
} from "@/lib/snapshot";

describe("fetchValidatedFeed", () => {
	const schema = z.object({ value: z.number() });
	const good = () => Response.json({ value: 7 });
	const malformed = () => new Response("{");

	function queuedFetch(...results: (Response | Error)[]) {
		let calls = 0;
		const fetch = async (_input: string, init?: RequestInit) => {
			calls++;
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			const result = results.shift();
			if (!result) throw new Error("missing queued response");
			if (result instanceof Error) throw result;
			return result;
		};
		return { fetch, calls: () => calls };
	}

	function recordedSleep() {
		const delays: number[] = [];
		return { sleep: async (ms: number) => void delays.push(ms), delays };
	}

	it("returns a valid feed without retrying", async () => {
		const feed = queuedFetch(good());
		const wait = recordedSleep();

		expect(await fetchValidatedFeed("test", "https://example.com", schema, { ...feed, ...wait })).toEqual({
			value: 7,
		});
		expect(feed.calls()).toBe(1);
		expect(wait.delays).toEqual([]);
	});

	it("retries a network failure", async () => {
		const feed = queuedFetch(new TypeError("connection reset"), good());
		const wait = recordedSleep();

		expect(await fetchValidatedFeed("test", "https://example.com", schema, { ...feed, ...wait })).toEqual({
			value: 7,
		});
		expect(feed.calls()).toBe(2);
		expect(wait.delays).toEqual([2000]);
	});

	it("retries a timeout", async () => {
		const feed = queuedFetch(new DOMException("timed out", "TimeoutError"), good());
		const wait = recordedSleep();

		expect(await fetchValidatedFeed("test", "https://example.com", schema, { ...feed, ...wait })).toEqual({
			value: 7,
		});
		expect(feed.calls()).toBe(2);
		expect(wait.delays).toEqual([2000]);
	});

	it("retries malformed JSON", async () => {
		const feed = queuedFetch(malformed(), good());
		const wait = recordedSleep();

		expect(await fetchValidatedFeed("test", "https://example.com", schema, { ...feed, ...wait })).toEqual({
			value: 7,
		});
		expect(feed.calls()).toBe(2);
		expect(wait.delays).toEqual([2000]);
	});

	it("honors and caps Retry-After for a 429", async () => {
		const feed = queuedFetch(new Response(null, { status: 429, headers: { "retry-after": "60" } }), good());
		const wait = recordedSleep();

		expect(await fetchValidatedFeed("test", "https://example.com", schema, { ...feed, ...wait })).toEqual({
			value: 7,
		});
		expect(feed.calls()).toBe(2);
		expect(wait.delays).toEqual([30_000]);
	});

	it("retries a server error and reports the final status", async () => {
		const feed = queuedFetch(new Response(null, { status: 502 }), new Response(null, { status: 503 }));
		const wait = recordedSleep();

		await expect(fetchValidatedFeed("stats", "https://example.com", schema, { ...feed, ...wait })).rejects.toThrow(
			"stats fetch failed after 2 attempts: HTTP 503",
		);
		expect(feed.calls()).toBe(2);
		expect(wait.delays).toEqual([2000]);
	});

	it("does not retry a permanent client error", async () => {
		const feed = queuedFetch(new Response(null, { status: 400 }));
		const wait = recordedSleep();

		await expect(
			fetchValidatedFeed("catalog", "https://example.com", schema, { ...feed, ...wait }),
		).rejects.toThrow("catalog fetch failed after 1 attempt: HTTP 400");
		expect(feed.calls()).toBe(1);
		expect(wait.delays).toEqual([]);
	});

	it("does not retry a schema mismatch", async () => {
		const feed = queuedFetch(Response.json({ value: "invalid" }));
		const wait = recordedSleep();

		await expect(
			fetchValidatedFeed("catalog", "https://example.com", schema, { ...feed, ...wait }),
		).rejects.toThrow("catalog validation failed on attempt 1");
		expect(feed.calls()).toBe(1);
		expect(wait.delays).toEqual([]);
	});
});

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
		expect(events.verifyRows).toEqual([
			{ pluginId: "p1", occurredAt: at, fromStatus: "unverified", toStatus: "verified" },
		]);
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
