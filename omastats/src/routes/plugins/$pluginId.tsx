import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/plugins/$pluginId")({
	head: ({ params }) => ({
		meta: [
			{ title: `${params.pluginId} · omastats` },
			{
				name: "description",
				content: `Hearts, views, copies, and snapshot history for the ${params.pluginId} plugin in the Omarchy catalog.`,
			},
		],
	}),
});
