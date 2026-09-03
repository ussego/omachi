import { describe, expect, it } from "bun:test";

import { apiErrorResponse } from "@/lib/api-error";

describe("apiErrorResponse", () => {
	it("keeps public errors generic", async () => {
		const response = apiErrorResponse(new Error("database details"));

		expect(response.status).toBe(500);
		expect((await response.json()) as { error: string }).toEqual({ error: "internal server error" });
	});

	it("exposes Error messages when explicitly enabled", async () => {
		const response = apiErrorResponse(new Error("stats fetch failed: HTTP 503"), true);

		expect(response.status).toBe(500);
		expect((await response.json()) as { error: string }).toEqual({ error: "stats fetch failed: HTTP 503" });
	});

	it("keeps unknown thrown values generic", async () => {
		const response = apiErrorResponse("database details", true);

		expect(response.status).toBe(500);
		expect((await response.json()) as { error: string }).toEqual({ error: "internal server error" });
	});

	it("preserves deliberate Response errors", () => {
		const original = Response.json({ error: "conflict" }, { status: 409 });

		expect(apiErrorResponse(original, true)).toBe(original);
	});
});
