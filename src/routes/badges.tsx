import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/badges")({
	head: () => ({
		meta: [
			{ title: "Badges · omastats" },
			{
				name: "description",
				content: "Embeddable stat badges for Omarchy plugins and authors: hearts, views, copies, and rankings.",
			},
		],
	}),
});
