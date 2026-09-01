import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { toastManager } from "@/components/ui/toast";

import type {
	AuthorDetailResponse,
	AuthorsResponse,
	BreakdownResponse,
	BrokenResponse,
	CategoriesResponse,
	ChartSeriesResponse,
	HealthResponse,
	HeatmapResponse,
	LeaderboardResponse,
	PluginDetailResponse,
	PluginListResponse,
	StatsResponse,
	TrendingResponse,
	UnverifiedResponse,
} from "./api-types";

// ── fetch helper ───────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.json() as Promise<T>;
}

// ── hooks ──────────────────────────────────────────────────────────────────

export type Granularity = "day" | "month" | "year";

/** One toast per failed fetch, keyed so refetch failures don't stack. */
export function useErrorToast(isError: boolean, message: string) {
	useEffect(() => {
		if (isError) toastManager.add({ type: "error", title: "Failed to load", description: message });
	}, [isError, message]);
}

const daysOf = (range: string | undefined) => (range === "all" ? undefined : range);

function statsQueryKey(kind: "published" | "updated" | "verified") {
	return (range: string | undefined, groupBy: Granularity, from?: string, to?: string) =>
		["stats", kind, daysOf(range), groupBy, from ?? null, to ?? null] as const;
}

const statsFn = (kind: "published" | "updated" | "verified") => {
	const key = statsQueryKey(kind);
	return (range: string | undefined, groupBy: Granularity, from?: string, to?: string) =>
		useQuery({
			queryKey: key(range, groupBy, from, to),
			queryFn: () => {
				const q = new URLSearchParams({ groupBy });
				if (daysOf(range)) q.set("range", daysOf(range)!);
				if (from) q.set("from", from);
				if (to) q.set("to", to);
				return get<StatsResponse>(`/api/stats/${kind}?${q}`);
			},
		});
};

export const usePublishedStats = statsFn("published");
export const useUpdatedStats = statsFn("updated");
export const useVerifiedStats = statsFn("verified");

export function useTotalStats(groupBy: Granularity) {
	return useQuery({
		queryKey: ["stats", "total", groupBy],
		queryFn: () => get<ChartSeriesResponse>(`/api/charts/omastats/total?groupBy=${groupBy}`),
	});
}

export function usePluginList(q: string, page: number, pageSize = 50) {
	return useQuery({
		queryKey: ["plugins", q, page, pageSize],
		queryFn: () =>
			get<PluginListResponse>(`/api/plugins?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`),
		// Keep the previous page of results while the next query loads —
		// otherwise the palette blanks and refills on every keystroke.
		placeholderData: keepPreviousData,
	});
}

export function useRecentPlugins(limit = 8) {
	return useQuery({
		queryKey: ["plugins", "recent", limit],
		queryFn: () => get<PluginListResponse>(`/api/plugins?sort=addedAt&page=1&pageSize=${limit}`),
	});
}

export function usePluginDetail(pluginId: string) {
	return useQuery({
		queryKey: ["plugins", pluginId],
		queryFn: () => get<PluginDetailResponse>(`/api/plugins/${encodeURIComponent(pluginId)}`),
		enabled: pluginId.length > 0,
	});
}

export function useLeaderboard(metric: string, limit = 25, sparkPoints = 10) {
	return useQuery({
		queryKey: ["leaderboard", metric, limit, sparkPoints],
		queryFn: () => get<LeaderboardResponse>(`/api/leaderboard/${metric}?limit=${limit}&sparkPoints=${sparkPoints}`),
		placeholderData: keepPreviousData,
	});
}

export function useTrending(days: 7 | 30) {
	return useQuery({
		queryKey: ["trending", days],
		queryFn: () => get<TrendingResponse>(`/api/leaderboard/trending?days=${days}`),
		placeholderData: keepPreviousData,
	});
}

export function useAuthors(enabled = true) {
	return useQuery({
		queryKey: ["authors"],
		queryFn: () => get<AuthorsResponse>("/api/authors/leaderboard"),
		placeholderData: keepPreviousData,
		enabled,
	});
}

export function useAuthorDetail(authorId: string) {
	return useQuery({
		queryKey: ["authors", authorId],
		queryFn: () => get<AuthorDetailResponse>(`/api/authors/${encodeURIComponent(authorId)}`),
	});
}

export function useBreakdown() {
	return useQuery({
		queryKey: ["breakdown"],
		queryFn: () => get<BreakdownResponse>("/api/stats/breakdown"),
	});
}

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: () => get<CategoriesResponse>("/api/stats/categories"),
	});
}

export function useHeatmap(from?: string, to?: string) {
	return useQuery({
		queryKey: ["heatmap", from ?? null, to ?? null],
		queryFn: () => {
			const q = new URLSearchParams();
			if (from) q.set("from", from);
			if (to) q.set("to", to);
			return get<HeatmapResponse>(`/api/stats/heatmap?${q}`);
		},
	});
}

export function useHealth() {
	return useQuery({
		queryKey: ["health"],
		queryFn: () => get<HealthResponse>("/api/health"),
	});
}

export function useBrokenPlugins() {
	return useQuery({
		queryKey: ["broken"],
		queryFn: () => get<BrokenResponse>("/api/health/broken"),
	});
}

export function useUnverifiedPlugins(range: string) {
	return useQuery({
		queryKey: ["unverified", range],
		queryFn: () => get<UnverifiedResponse>(`/api/health/unverified?range=${range}`),
	});
}
