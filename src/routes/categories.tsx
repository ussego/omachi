import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/categories")({
	head: () => ({
		meta: [
			{ title: "Categories · omastats" },
			{
				name: "description",
				content:
					"Plugin counts and engagement by category for the Omarchy catalog, with a monthly activity heatmap.",
			},
		],
	}),
});
