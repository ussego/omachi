import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { CHART_SVG_POINTER, stripChartExt } from "@/lib/api-helpers";
import type { ChartSeriesResponse } from "@/lib/api-types";
import { omastatsPublished, omastatsTotal, omastatsUpdated, omastatsVerified } from "@/lib/charts";

export const Route = createFileRoute("/api/charts/omastats/$kind")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const kind = stripChartExt(params.kind);
				if (kind === null) return Response.json({ error: CHART_SVG_POINTER }, { status: 400 });
				const q = new URL(request.url).searchParams;
				const db = drizzle(env.DB);
				const rawGroupBy = q.get("groupBy");
				const groupBy =
					rawGroupBy === "day" || rawGroupBy === "year" || rawGroupBy === "month"
						? rawGroupBy
						: kind === "updated" || kind === "verified"
							? "day"
							: "month";
				const series =
					kind === "published"
						? await omastatsPublished(db, groupBy)
						: kind === "updated"
							? await omastatsUpdated(db, groupBy)
							: kind === "verified"
								? await omastatsVerified(db, q.get("toStatus"), groupBy)
								: kind === "total"
									? await omastatsTotal(db, groupBy)
									: null;
				if (!series)
					return Response.json(
						{ error: "usage: /api/charts/omastats/{published|updated|verified|total}" },
						{ status: 400 },
					);
				return Response.json(series satisfies ChartSeriesResponse);
			},
		},
	},
});
