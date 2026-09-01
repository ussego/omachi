import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, count, desc, eq, like, or, type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { plugins } from "@/db/schema";
import { withoutCurrent } from "@/lib/api-helpers";
import type { PluginListResponse } from "@/lib/api-types";

type PluginRow = typeof plugins.$inferSelect;

function latestFrom(r: PluginRow) {
	return r.currentSnapshotAt
		? {
				pluginId: r.id,
				snapshotAt: r.currentSnapshotAt,
				views: r.currentViews,
				copies: r.currentCopies,
				hearts: r.currentHearts,
				verificationStatus: r.currentVerificationStatus,
				version: r.currentVersion,
				repositoryUpdatedAt: r.currentRepositoryUpdatedAt,
				upstreamCheckStatus: r.currentUpstreamCheckStatus,
			}
		: null;
}

export const Route = createFileRoute("/api/plugins")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const q = new URL(request.url).searchParams;
				const db = drizzle(env.DB);
				const page = Math.max(1, parseInt(q.get("page") ?? "1", 10) || 1);
				const pageSize = Math.min(100, Math.max(1, parseInt(q.get("pageSize") ?? "50", 10) || 50));

				const conds: SQL[] = [];
				const search = q.get("q");
				if (search) {
					const like_ = `%${search}%`;
					conds.push(or(like(plugins.name, like_), like(plugins.author, like_), like(plugins.id, like_))!);
				}
				if (q.get("category")) conds.push(eq(plugins.category, q.get("category")!));
				if (q.get("author")) conds.push(eq(plugins.author, q.get("author")!));
				if (q.get("kind")) conds.push(eq(plugins.kind, q.get("kind")!));
				if (q.get("verification")) conds.push(eq(plugins.currentVerificationStatus, q.get("verification")!));
				const where = conds.length ? and(...conds) : undefined;

				const [{ total }] = await db.select({ total: count() }).from(plugins).where(where).all();
				const rows = await db
					.select()
					.from(plugins)
					.where(where)
					.orderBy(
						...(search
							? [sql`${plugins.name} like ${`${search}%`} desc`, plugins.name, plugins.id]
							: q.get("sort") === "addedAt"
								? [desc(plugins.addedAt), desc(sql`rowid`)]
								: [plugins.id]),
					)
					.limit(pageSize)
					.offset((page - 1) * pageSize)
					.all();
				return Response.json({
					total,
					page,
					pageSize,
					plugins: rows.map((r) => ({
						...withoutCurrent(r),
						tags: r.tags ? JSON.parse(r.tags) : null,
						latest: latestFrom(r),
					})),
				} satisfies PluginListResponse);
			},
		},
	},
});
