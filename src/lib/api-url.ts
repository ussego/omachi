import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Resolve an `/api` path for the current execution environment. Route loaders
 * are isomorphic: in the browser they fetch the relative URL as before, while
 * during SSR they self-subrequest an absolute URL derived from the incoming
 * request. That subrequest re-enters the edge-cache middleware in `start.ts`,
 * so per-view D1 reads stay identical to a browser visit. The request context
 * import is lazy so it never reaches the client bundle, and the origin is
 * never hard-coded (workers.dev previews and custom domains must both work).
 */
export const apiUrl = createIsomorphicFn()
	.server(async (path: string) => {
		const { getRequest } = await import("@tanstack/react-start/server");
		return new URL(path, getRequest().url).toString();
	})
	.client(async (path: string) => path);
