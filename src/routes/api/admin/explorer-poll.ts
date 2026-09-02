import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

import { pollExplorerRelations } from "@/lib/explorer";
import { adminAuth } from "@/start";

export const Route = createFileRoute("/api/admin/explorer-poll")({
	server: {
		middleware: [adminAuth],
		handlers: {
			POST: async () => Response.json(await pollExplorerRelations(env)),
		},
	},
});
