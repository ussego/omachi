import "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

import { runSnapshot } from "@/lib/snapshot";
import { adminAuth } from "@/start";

export const Route = createFileRoute("/api/admin/snapshot")({
	server: {
		middleware: [adminAuth],
		handlers: {
			POST: async () => Response.json(await runSnapshot(env)),
		},
	},
});
