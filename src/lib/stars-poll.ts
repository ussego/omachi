import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import { omarchyStars } from "../db/schema";
import { writeBatches } from "./snapshot";

/** `GITHUB_TOKEN` is a Worker secret (optional). Other bindings come from CloudflareBindings. */
export type StarsEnv = CloudflareBindings & { GITHUB_TOKEN?: string };

export interface PollStarsResult {
	stars: number;
	recordedAt: string;
}

export interface BackfillStarsResult {
	pagesProcessed: number;
	starsInserted: number;
	hasMore: boolean;
	nextPage: number | null;
	rateLimitRemaining: number | null;
}

/** One-shot diagnostic: hits /repos/{repo} and /repos/{repo}/stargazers with the
 * Worker secret and reports the URL, token prefix, status, and rate-limit
 * headers so we can tell token-type from URL bugs in one curl. */
export async function debugStars(env: StarsEnv) {
	const repo = repoFromEnv(env);
	const api = env.GITHUB_API;
	const tok = env.GITHUB_TOKEN ?? null;
	const tokKind = tok
		? tok.startsWith("github_pat_")
			? "fine_grained"
			: tok.startsWith("ghp_") || tok.startsWith("gho_") || tok.startsWith("ghs_") || tok.startsWith("ghu_") || tok.startsWith("ghr_")
				? "classic"
				: "unknown"
		: null;
	const headers = ghHeaders(env, "v3");
	const repoUrl = `${api}/repos/${repo}`;
	const starsUrl = `${api}/repos/${repo}/stargazers?per_page=1`;
	const [repoRes, starsRes, starsPlainRes] = await Promise.all([
		fetch(repoUrl, { headers }),
		fetch(starsUrl, { headers: ghHeaders(env, "star+json") }),
		// Same URL without star+json — if this 200s and the other 404s, the
		// bug is the Accept header (star+json media type is restricted).
		fetch(starsUrl, { headers }),
	]);
	return {
		env: { api, repo, hasToken: tok != null, tokKind },
		repo: {
			url: repoUrl,
			status: repoRes.status,
			ok: repoRes.ok,
			rateLimitRemaining: repoRes.headers.get("x-ratelimit-remaining"),
		},
		stargazers: {
			url: starsUrl,
			status: starsRes.status,
			ok: starsRes.ok,
			rateLimitRemaining: starsRes.headers.get("x-ratelimit-remaining"),
		},
		stargazersPlain: {
			url: starsUrl,
			accept: "application/vnd.github+json (default)",
			status: starsPlainRes.status,
			ok: starsPlainRes.ok,
			rateLimitRemaining: starsPlainRes.headers.get("x-ratelimit-remaining"),
		},
	};
}

/** GitHub accepts "owner/repo" only. */
function repoFromEnv(env: StarsEnv): string {
	const repo = env.OMARCHY_REPO;
	if (!repo?.includes("/")) throw new Error("OMARCHY_REPO must be set as 'owner/repo'");
	return repo;
}

function ghHeaders(env: StarsEnv, accept: "v3" | "star+json"): HeadersInit {
	const h: Record<string, string> = { "User-Agent": "omastats" };
	if (accept === "star+json") h.Accept = "application/vnd.github.v3.star+json";
	else h.Accept = "application/vnd.github+json";
	if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
	return h;
}

function remainingFrom(res: Response): number | null {
	const v = res.headers.get("x-ratelimit-remaining");
	return v == null ? null : Number(v);
}

/** Parse a Link header into a next-page number (or null if there is none). */
function nextPageFrom(link: string | null): number | null {
	if (!link) return null;
	const m = link.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
	return m ? Number(m[1]) : null;
}

/**
 * Cheap hourly poll: fetch live star count and append one row. Cumulative
 * curve, so the current value is `max(stars)` across all rows.
 */
export async function pollStars(env: StarsEnv): Promise<PollStarsResult> {
	const repo = repoFromEnv(env);
	const res = await fetch(`${env.GITHUB_API}/repos/${repo}`, { headers: ghHeaders(env, "v3") });
	if (!res.ok) throw new Error(`github repo fetch failed: ${res.status}`);
	const body = (await res.json()) as { stargazers_count?: number };
	const stars = body.stargazers_count;
	if (typeof stars !== "number") throw new Error("github response missing stargazers_count");
	const recordedAt = new Date().toISOString();
	const db = drizzle(env.DB);
	await db.insert(omarchyStars).values([{ recordedAt, stars, source: "poll" }]).run();
	return { stars, recordedAt };
}

/**
 * One-shot historical backfill via the /stargazers endpoint with the
 * `application/vnd.github.v3.star+json` media type, which exposes
 * `starred_at` for every star. Inserts one row per star event with
 * `source='backfill'`. Requires `GITHUB_TOKEN` (anonymous is rate-limited
 * to 60/hr, which won't cover a non-trivial backfill).
 */
export async function backfillStars(env: StarsEnv, opts: { maxPages?: number } = {}): Promise<BackfillStarsResult> {
	if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN required for backfill (anonymous is rate-limited)");
	const repo = repoFromEnv(env);
	const maxPages = opts.maxPages ?? Number.MAX_SAFE_INTEGER;
	let page = 1;
	let pagesProcessed = 0;
	let starsInserted = 0;
	let lastRemaining: number | null = null;
	let hasMore = false;
	let nextPage: number | null = null;
	const allRows: { recordedAt: string; stars: number; source: "backfill" }[] = [];

	while (page <= maxPages) {
		const url = `${env.GITHUB_API}/repos/${repo}/stargazers?per_page=100&page=${page}`;
		const res = await fetch(url, { headers: ghHeaders(env, "star+json") });
		lastRemaining = remainingFrom(res);
		if (res.status === 403 || res.status === 429) {
			throw new Error(`github backfill aborted: ${res.status} (rate-limit remaining: ${lastRemaining})`);
		}
		if (!res.ok) throw new Error(`github backfill failed: ${res.status}`);
		const page_ = (await res.json()) as { starred_at?: string; user?: unknown }[];
		pagesProcessed++;
		for (const s of page_) {
			if (!s.starred_at) continue;
			allRows.push({ recordedAt: s.starred_at, stars: 0, source: "backfill" });
		}
		if (page_.length < 100) break;
		nextPage = nextPageFrom(res.headers.get("link"));
		if (nextPage == null) break;
		hasMore = true;
		page = nextPage;
	}
	// Backfill rows store the *event time*; cumulative `stars` is filled
	// in afterwards in one pass over the merged timeline.
	const db = drizzle(env.DB);
	if (allRows.length) {
		const stmts: BatchItem<"sqlite">[] = [];
		for (const r of allRows) stmts.push(db.insert(omarchyStars).values([r]));
		await writeBatches(db, stmts);
	}
	// Recompute cumulative stars for backfill rows (poll rows are already
	// cumulative; we leave them alone — the read query takes max across
	// both sources).
	const backfillRows = await db
		.select({ id: omarchyStars.id, recordedAt: omarchyStars.recordedAt })
		.from(omarchyStars)
		.where(eq(omarchyStars.source, "backfill"))
		.orderBy(omarchyStars.recordedAt)
		.all();
	// Sort again locally in case the DB returned them out of order.
	backfillRows.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
	let cumulative = 0;
	const updates: BatchItem<"sqlite">[] = [];
	for (const r of backfillRows) {
		cumulative++;
		updates.push(db.update(omarchyStars).set({ stars: cumulative }).where(eq(omarchyStars.id, r.id)));
	}
	await writeBatches(db, updates);
	starsInserted = allRows.length;
	return { pagesProcessed, starsInserted, hasMore, nextPage: hasMore ? nextPage : null, rateLimitRemaining: lastRemaining };
}