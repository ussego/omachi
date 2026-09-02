import type { drizzle } from "drizzle-orm/d1";

export const CHUNK = 100; // D1 batches cap at 100 statements

export type DrizzleDb = ReturnType<typeof drizzle>;

export async function batch<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
	for (let i = 0; i < rows.length; i += size) {
		await fn(rows.slice(i, i + size));
	}
}
