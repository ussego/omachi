import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { BADGE_COLORS, cap } from "@/lib/api-helpers";
import type { BadgeResponse } from "@/lib/api-types";
import { badgeRank, isRankStat } from "@/lib/badges";

export const Route = createFileRoute("/api/badges/ranking/$stat/$id")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { stat, id } = params;
				if (!isRankStat(stat))
					return Response.json({ error: "stat must be views, copies, hearts, or avg" }, { status: 400 });
				const rank = await badgeRank(drizzle(env.DB), stat, id);
				if (!rank) return Response.json({ error: "not found" }, { status: 404 });
				return Response.json({
					schemaVersion: 1,
					label: `${stat === "avg" ? "Avg" : cap(stat)} rank`,
					message: String(rank.rank),
					color: BADGE_COLORS[stat],
				} satisfies BadgeResponse);
			},
		},
	},
});
