Status: done
Type: task
Blocked by: 01

# API migration: Hono → native TanStack Start Server Routes

See ADR-0002 for why (drop Hono entirely, not a catch-all mount).

## Scope

Full endpoint list from `omastats/src/lib/api.ts` (all currently mounted
under `/api` in Hono) → one TanStack Start Server Route file per resource
under `omachi/src/routes/api/`. Query logic moves inline into each file
(deep-module: most of these have exactly one caller). Response shapes are
**byte-for-byte unchanged** — `src/lib/api-types.ts` is the wire contract
and does not change.

| Method | Path | New file |
|---|---|---|
| GET | `/api/plugins` | `routes/api/plugins.ts` |
| GET | `/api/plugins/:id` | `routes/api/plugins/$id.ts` |
| GET | `/api/stats/published` | `routes/api/stats/published.ts` |
| GET | `/api/stats/updated` | `routes/api/stats/updated.ts` |
| GET | `/api/stats/verified` | `routes/api/stats/verified.ts` |
| GET | `/api/stats/categories` | `routes/api/stats/categories.ts` |
| GET | `/api/stats/breakdown` | `routes/api/stats/breakdown.ts` |
| GET | `/api/stats/heatmap` | `routes/api/stats/heatmap.ts` |
| GET | `/api/leaderboard/trending` | `routes/api/leaderboard/trending.ts` |
| GET | `/api/leaderboard/:metric` | `routes/api/leaderboard/$metric.ts` |
| GET | `/api/authors/leaderboard` | `routes/api/authors/leaderboard.ts` |
| GET | `/api/authors/:authorId` | `routes/api/authors/$authorId.ts` |
| GET | `/api/badges/:stat/:id` | `routes/api/badges/$stat/$id.ts` |
| GET | `/api/badges/ranking/:stat/:id` | `routes/api/badges/ranking/$stat/$id.ts` |
| GET | `/api/charts/omastats/:kind` | `routes/api/charts/omastats/$kind.ts` |
| GET | `/api/charts/plugin/:id/:metric` | `routes/api/charts/plugin/$id/$metric.ts` |
| GET | `/api/charts/author/:login/:metric` | `routes/api/charts/author/$login/$metric.ts` |
| POST | `/api/admin/snapshot` | `routes/api/admin/snapshot.ts` |
| POST | `/api/admin/light-poll` | `routes/api/admin/light-poll.ts` |
| GET | `/api/health` | `routes/api/health.ts` |
| GET | `/api/health/unverified` | `routes/api/health/unverified.ts` |
| GET | `/api/health/broken` | `routes/api/health/broken.ts` |

`/api/charts/omastats/:kind` keeps its literal `omastats` path segment —
that's the wire contract external chart embeds already point at
(shieldcn URLs), not a naming choice to "fix" as part of the rebrand.

Static routes `/robots.txt`, `/llms.txt` are handled in issue 01, not here.

### Shared helpers → `src/lib/api-helpers.ts`

Move these out of the monolithic `api.ts` (each has multiple callers
across the new route files): `withoutCurrent()`, `latestFrom()`,
`countsRoute()`, `dateRange()`, `groupLen()`, `chartGroupBy()`,
`chartMetric()`, `stripChartExt()`, `CHART_SVG_POINTER`, `latestMaxIds()`,
`BADGE_COLORS`/`cap()` if still shared after the split. Check each helper
against its actual call sites before moving it — if something only turns
out to have one caller once split, inline it instead (deletion test).

### Cloudflare bindings

Replace every `c.env.DB` / `c.env.ADMIN_TOKEN` with
`import { env } from "cloudflare:workers"` at the top of each route file,
then `env.DB` / `env.ADMIN_TOKEN`. `drizzle(env.DB)` replaces
`drizzle(c.env.DB)` throughout. `runSnapshot(env)` / `pollNewPlugins(env)`
calls in the two admin routes need no change beyond this — both functions
already take `env: CloudflareBindings` directly (not a Hono `Context`).

### Middleware (confirmed via TanStack's official server-routes/middleware
skills — `createFileRoute(...).server.middleware`, `createMiddleware()`)

**Global edge-cache middleware** — `src/start.ts` (new file):
```ts
import { createStart, createMiddleware } from "@tanstack/react-start";

const edgeCache = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (request.method !== "GET" || !url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/health")) {
    return next();
  }
  const cache = caches.default;
  const hit = await cache.match(url);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("x-cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers });
  }
  const res = await next();
  if (res.status >= 200 && res.status < 300) {
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "public, s-maxage=3600");
    headers.set("x-cache", "MISS");
    const out = new Response(res.clone().body, { status: res.status, headers });
    const { waitUntil } = await import("cloudflare:workers");
    waitUntil(cache.put(url, out.clone()));
    return out;
  }
  return res;
});

export const startInstance = createStart(() => ({ requestMiddleware: [edgeCache] }));
```
Confirm the exact `next()` return shape against the installed
`@tanstack/react-start` version's types (request middleware's `next()`
result handling may differ slightly from this sketch — treat as a
starting point, not copy-paste truth). `/api/health*` and non-GET requests
must fall through uncached, matching today's behavior exactly.

**Admin auth middleware** — small, attached only to the two admin routes:
```ts
const adminAuth = createMiddleware().server(async ({ next, request }) => {
  const { env } = await import("cloudflare:workers");
  if (request.headers.get("x-admin-token") !== env.ADMIN_TOKEN) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return next();
});
```
attached via `server: { middleware: [adminAuth], handlers: { POST: ... } }`
in `routes/api/admin/snapshot.ts` and `routes/api/admin/light-poll.ts`.

## Acceptance

- Every path/method in the table above returns the same JSON shape as
  today (spot-check against `api-types.ts` — the server-routes skill flags
  "trusting TypeScript as response-schema validation" as a common mistake;
  actually call each endpoint and diff the response, don't just typecheck).
- `GET /api/health*` responses carry `Cache-Control: no-cache`; every other
  GET gets `x-cache: HIT|MISS` and `Cache-Control: public, s-maxage=3600`.
- `POST /api/admin/*` without a valid `x-admin-token` returns 401.
- No file imports `hono`.
