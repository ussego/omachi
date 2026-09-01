import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/charts")({
	head: () => ({
		meta: [
			{ title: "Charts · omastats" },
			{
				name: "description",
				content:
					"Embeddable chart images for Omarchy catalog stats — rendered by shieldcn from omastats' JSON chart endpoints.",
			},
		],
	}),
});
