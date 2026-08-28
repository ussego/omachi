import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
	head: () => ({
		meta: [
			{ title: "Ecosystem Health · omastats" },
			{
				name: "description",
				content:
					"Verification status, install availability, and broken plugins across the Omarchy plugin catalog.",
			},
		],
	}),
});
