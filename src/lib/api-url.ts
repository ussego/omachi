import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Fetch an `/api` path in the current execution environment. Route loaders are
 * isomorphic: in the browser this fetches the relative URL, while during SSR
 * it goes through the `SELF` service binding so the request re-enters this
 * Worker. A plain `fetch()` to the Worker's own custom domain never re-invokes
 * the Worker (the runtime routes it to the zone origin instead, which is a 522
 * here), so the binding is the only self-subrequest path that works in
 * production. It preserves the original design: the subrequest runs the
 * edge-cache middleware in `start.ts`, so per-view D1 reads stay identical to
 * a browser visit. Imports stay lazy so they never reach the client bundle,
 * and the URL derives from the incoming request — never hard-coded
 * (workers.dev previews and custom domains must both work).
 */
export const apiFetch = createIsomorphicFn()
	.server(async (path: string) => {
		const url = new URL(path, (await import("@tanstack/react-start/server")).getRequest().url);
		try {
			const { env } = await import("cloudflare:workers");
			if (env.SELF) return env.SELF.fetch(url);
		} catch {
			// Not a Workers runtime (no `cloudflare:workers` module): fall through.
		}
		return fetch(url);
	})
	.client((path: string) => fetch(path));
