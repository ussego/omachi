import { env, waitUntil } from "cloudflare:workers";
import { createMiddleware, createStart } from "@tanstack/react-start";

const edgeCache = createMiddleware().server(async ({ next, request }) => {
	const url = new URL(request.url);
	if (request.method !== "GET" || !url.pathname.startsWith("/api/")) {
		return next();
	}

	if (url.pathname.startsWith("/api/health")) {
		const result = await next();
		const response = result instanceof Response ? result : result.response;
		const headers = new Headers(response.headers);
		headers.set("Cache-Control", "no-cache");
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
	}

	const cache = (globalThis.caches as unknown as { default: Cache }).default;
	const hit = await cache.match(url);
	if (hit) {
		const headers = new Headers(hit.headers);
		headers.set("x-cache", "HIT");
		return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
	}

	const result = await next();
	const response = result instanceof Response ? result : result.response;
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "public, s-maxage=3600");
	headers.set("x-cache", "MISS");
	const output = new Response(response.clone().body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
	if (response.status >= 200 && response.status < 300) waitUntil(cache.put(url, output.clone()));
	return output;
});

export const adminAuth = createMiddleware().server(async ({ next, request }) => {
	const adminToken = (env as CloudflareBindings & { ADMIN_TOKEN?: string }).ADMIN_TOKEN;
	if (!adminToken || request.headers.get("x-admin-token") !== adminToken) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	return next();
});

export const startInstance = createStart(() => ({ requestMiddleware: [edgeCache] }));
