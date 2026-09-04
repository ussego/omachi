/** @jsxImportSource react */

import { IconExternalLink } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { Code, Snippet } from "@/components/snippet";
import { buttonVariants } from "@/components/ui/button";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/api-docs")({
	head: () =>
		pageHead(
			"Public API Docs · Omachi",
			"Omachi's public JSON API: plugins, authors, leaderboards, badges, and charts for external renderers and embedders.",
			"/api-docs",
		),
	component: ApiDocsPage,
});

// Wire truth lives in src/lib/api-types.ts — update the prose below by hand when those shapes change.
const BASE = "https://stats.ussego.com";

function ApiDocsPage() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="font-heading text-2xl">Public API</h1>
				<a
					href="https://github.com/ussego/omachi"
					target="_blank"
					rel="noreferrer"
					className={buttonVariants({ variant: "outline" })}
				>
					<IconExternalLink data-icon="inline-start" />
					<span>Source</span>
				</a>
			</div>

			<p className="max-w-2xl text-muted-foreground">
				Unauthenticated GET JSON for external renderers and embedders. Base URL is <Code>{BASE}</Code>; GETs are
				edge-cached for one hour (<Code>/api/leaderboard/trending</Code> for eight). Badge and chart payloads
				are rendered by external renderers — see <Code>/badges</Code> and <Code>/charts</Code> for the embed
				guides.
			</p>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Plugins</h2>
				<Snippet>GET /api/plugins?page=1&pageSize=50&q=otel&category=AI&author=ussego&sort=addedAt</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Filters: <Code>q</Code> (name/author/id), <Code>category</Code>, <Code>author</Code>,{" "}
						<Code>kind</Code>, <Code>verification</Code>. <Code>pageSize</Code> max 100.
					</li>
					<li>
						Each row carries <Code>latest</Code> (current views/copies/hearts, verification, version) or{" "}
						<Code>null</Code> when the Light Poll found it but no Heavy Poll has run yet.
					</li>
				</ul>
				<Snippet>{`{"total": 1553, "page": 1, "pageSize": 50, "plugins": [{"id": "ussego.otoru", "latest": {"hearts": 42, ...}}, ...]}`}</Snippet>
				<Snippet>GET /api/plugins/:id</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Returns <Code>plugin</Code>, 90 days of <Code>snapshots</Code>, <Code>averages</Code>, and{" "}
						<Code>relations</Code> (<Code>null</Code> for built-ins or pre-sync plugins).
					</li>
				</ul>
				<Snippet>{`curl ${BASE}/api/plugins/ussego.otoru`}</Snippet>
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Authors and leaderboards</h2>
				<Snippet>GET /api/authors/:login</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Author <Code>totals</Code>, per-plugin rows, and per-poll <Code>activity</Code>. 404 when the
						author has no snapshotted plugin.
					</li>
				</ul>
				<Snippet>GET /api/leaderboard/:metric?limit=50&sparkPoints=0</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<Code>metric</Code> is <Code>hearts</Code>, <Code>views</Code>, <Code>copies</Code>, or{" "}
						<Code>copies_per_view</Code>. <Code>limit</Code> max 100; <Code>sparkPoints</Code> (0–30)
						attaches recent snapshot history per row.
					</li>
					<li>
						<Code>GET /api/leaderboard/trending?days=7</Code> ranks Jenna8978 by Heavy-Poll diffs instead of
						current totals.
					</li>
				</ul>
				<Snippet>{`curl "${BASE}/api/leaderboard/hearts?limit=10"`}</Snippet>
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Badges and charts</h2>
				<p className="max-w-2xl text-muted-foreground">
					Badges return shields.io endpoint JSON (<Code>schemaVersion/label/message/color</Code>); chart
					endpoints return <Code>{"{title, total, points: [{date, count}]}"}</Code>. Full params and live
					examples live on their pages:
				</p>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<Code>GET /api/badges/:stat/:id</Code> and <Code>GET /api/badges/ranking/:stat/:id</Code> — see{" "}
						<a href="/badges" className="underline decoration-dotted underline-offset-4">
							/badges
						</a>
						.
					</li>
					<li>
						<Code>GET /api/charts/plugin/:id/:metric</Code>, <Code>/api/charts/author/:login/:metric</Code>,{" "}
						<Code>/api/charts/omastats/:kind</Code> — see{" "}
						<a href="/charts" className="underline decoration-dotted underline-offset-4">
							/charts
						</a>
						.
					</li>
				</ul>
				<Snippet>{`curl ${BASE}/api/badges/hearts/ussego.otoru`}</Snippet>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Errors and non-contract</h2>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<Code>400</Code> for an unknown <Code>stat</Code>/<Code>metric</Code> (
						<Code>stat must be views, copies, or hearts</Code>); <Code>404</Code> for unknown plugin or
						author.
					</li>
					<li>
						Not part of this contract and undocumented on purpose: <Code>/api/stats/*</Code>,{" "}
						<Code>/api/health*</Code> (uncached), and <Code>/api/admin/*</Code> (token-gated ops).
					</li>
				</ul>
			</div>
		</div>
	);
}
