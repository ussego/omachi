---
status: accepted
---

# Replace Hono with native TanStack Start Server Routes

The shell migration swaps Vite-SSR-with-Hono for TanStack Start. One option was to keep the existing Hono `api.ts` app entirely and mount it wholesale behind a single TanStack Start catch-all server route (`/api/$`) — a well-established community pattern that avoids rewriting ~25 endpoints, at the cost of carrying two routing frameworks forward indefinitely and needing a `cloudflare:workers` `env` workaround to get Cloudflare bindings into Hono's context.

We chose instead to drop Hono entirely and rebuild every `/api/...` endpoint as a native TanStack Start Server Route (`createFileRoute(...).server.handlers`). TanStack Start's own middleware and handler-context primitives (`server.middleware`, `createMiddleware`, `cloudflare:workers` `env`) cover everything Hono's `api.use()` provided — edge caching via the Cache API and admin-token auth — so there's no capability gap, and a single framework is less to maintain than two.

## Consequences

Every existing `/api/...` URL and JSON response shape is preserved byte-for-byte; only the routing/framework layer underneath changes. `hono` and `vite-ssr-components` are removed as dependencies once the rewrite lands.
