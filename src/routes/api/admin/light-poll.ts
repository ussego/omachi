import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

import { pollNewPlugins } from "@/lib/light-poll";
import { adminAuth } from "@/start";

export const Route = createFileRoute("/api/admin/light-poll")({
	server: {
		middleware: [adminAuth],
		handlers: {
			POST: async () => Response.json(await pollNewPlugins(env)),
		},
	},
});
