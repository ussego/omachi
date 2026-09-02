import { describe, expect, it } from "bun:test";

import { relationsFromExplorer } from "@/lib/explorer";

describe("relationsFromExplorer", () => {
	const knownIds = new Set(["a", "b", "c", "d"]);

	it("resolves neighbors by index, sorts desc, rounds, and filters unknowns and self", () => {
		const payload = {
			nodes: [
				{ index: 0, id: "a", cluster: "system", influence: 13.264, neighbors: [] },
				{
					index: 1,
					id: "b",
					cluster: "system",
					influence: 9.5,
					neighbors: [
						{ index: 0, similarity: 0.256 },
						{ index: 3, similarity: 0.11999 },
						{ index: 1, similarity: 1 }, // self
						{ index: 99, similarity: 0.9 }, // unknown index
					],
				},
				// In the catalog but not in known ids — row must be skipped.
				{ index: 2, id: "ghost", cluster: "system", neighbors: [] },
				{ index: 3, id: "c", neighbors: [] },
				// Junk entries without an id are ignored.
				{ index: 4, influence: 1 },
			],
			clusters: [
				{ id: "system", label: "System & Monitoring", color: "#fff" },
				{ id: "ai", label: "AI & Automation" },
			],
		};

		const result = relationsFromExplorer(payload, knownIds, "2026-09-02T06:00:00.000Z");

		expect(result).not.toBeNull();
		expect(result?.nodes).toBe(3);
		expect(result?.rows.map((row) => row.pluginId)).toEqual(["a", "b", "c"]);

		const b = result?.rows.find((row) => row.pluginId === "b");
		expect(b?.related).toBe(
			JSON.stringify([
				{ pluginId: "a", similarity: 0.256 },
				{ pluginId: "c", similarity: 0.12 },
			]),
		);
		expect(b?.cluster).toBe("System & Monitoring");
		expect(b?.influence).toBe(9.5);
		expect(b?.refreshedAt).toBe("2026-09-02T06:00:00.000Z");

		const a = result?.rows.find((row) => row.pluginId === "a");
		expect(a?.related).toBeNull();
		expect(a?.cluster).toBe("System & Monitoring");
		expect(a?.influence).toBe(13.264);
	});

	it("falls back to the raw cluster id when the label is missing", () => {
		const payload = {
			nodes: [{ index: 0, id: "a", cluster: "mystery", influence: 1, neighbors: [] }],
			clusters: [{ id: "system", label: "System & Monitoring" }],
		};

		const result = relationsFromExplorer(payload, knownIds, "2026-09-02T06:00:00.000Z");
		expect(result?.rows[0].cluster).toBe("mystery");
	});

	it("skips non-finite similarity values", () => {
		const payload = {
			nodes: [
				{ index: 0, id: "a", neighbors: [] },
				{
					index: 1,
					id: "b",
					neighbors: [
						{ index: 0, similarity: Number.NaN },
						{ index: 2, similarity: Number.POSITIVE_INFINITY },
						{ index: 3, similarity: 0.5 },
					],
				},
				{ index: 2, id: "c", neighbors: [] },
				{ index: 3, id: "d", neighbors: [] },
			],
		};

		const result = relationsFromExplorer(payload, knownIds, "2026-09-02T06:00:00.000Z");
		const b = result?.rows.find((row) => row.pluginId === "b");
		expect(b?.related).toBe(JSON.stringify([{ pluginId: "d", similarity: 0.5 }]));
	});

	it("returns null for malformed payloads", () => {
		expect(relationsFromExplorer(null, knownIds, "t")).toBeNull();
		expect(relationsFromExplorer({}, knownIds, "t")).toBeNull();
		expect(relationsFromExplorer({ nodes: [] }, knownIds, "t")).toBeNull();
		expect(relationsFromExplorer({ nodes: "nope" }, knownIds, "t")).toBeNull();
		expect(relationsFromExplorer("junk", knownIds, "t")).toBeNull();
	});
});
