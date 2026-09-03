import { describe, expect, test } from "bun:test";

import { fmtDate, fmtMonthDay } from "@/lib/format";

describe("UTC date formatting", () => {
	test("keeps date-only buckets on their calendar date", () => {
		expect(fmtMonthDay("2026-09-02")).toBe("Sep 2");
		expect(fmtDate("2026-09-02")).toBe("Sep 2, 2026");
	});
});
