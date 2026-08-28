import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authors/$authorId")({
	head: ({ params }) => ({
		meta: [
			{ title: `${params.authorId} · omastats` },
			{
				name: "description",
				content: `Plugins, hearts, views, and copies for Omarchy plugin author ${params.authorId}.`,
			},
		],
	}),
});
