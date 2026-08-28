import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "omastats — Analytics for the Omarchy plugin catalog" },
			{
				name: "description",
				content:
					"Live analytics for the Omarchy plugin catalog: hearts, views, copies, leaderboards, ecosystem health, categories, and embeddable badges.",
			},
		],
	}),
});
