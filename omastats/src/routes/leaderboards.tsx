import { createFileRoute } from "@tanstack/react-router";

const VALID_TABS = ["hearts", "views", "copies", "copies_per_view", "trending", "authors"] as const;

export const Route = createFileRoute("/leaderboards")({
	head: () => ({
		meta: [
			{ title: "Leaderboards · omastats" },
			{
				name: "description",
				content:
					"Top Omarchy plugins by hearts, views, copies, and conversion, plus trending and author leaderboards.",
			},
		],
	}),
	validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
		tab: (VALID_TABS as readonly string[]).includes(search.tab as string) ? (search.tab as string) : undefined,
	}),
});
