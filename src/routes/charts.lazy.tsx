/** @jsxImportSource react */
import { ExternalLinkIcon } from "lucide-react";

import { createLazyFileRoute } from "@tanstack/react-router";

import { DitherButton } from "@/components/dither-kit/button";
import { Code, CopyButton, Snippet } from "@/components/snippet";

export const Route = createLazyFileRoute("/charts")({
	component: ChartsPage,
});

const BASE = "https://stats.ussego.com/api/charts";
const PICK = "query=$.points[*].count&dateQuery=$.points[*].date";
const SIZE = "width=520&height=180";

// Live example charts (rendered by shieldcn from stats.ussego.com/api/charts JSON).
// Note: no .json extension — shieldcn's fetcher rejects dot-suffixed URLs.
const EXAMPLES: { path: string; src: string }[] = [
	{
		path: "/api/charts/omastats/published",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/omastats/published&${PICK}&title=Plugins+published&${SIZE}`,
	},
	{
		path: "/api/charts/omastats/total",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/omastats/total&${PICK}&title=Total+plugins&${SIZE}`,
	},
	{
		path: "/api/charts/omastats/updated",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/omastats/updated&${PICK}&title=Plugin+updates&${SIZE}`,
	},
	{
		path: "/api/charts/omastats/verified",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/omastats/verified&${PICK}&title=Verifications&${SIZE}`,
	},
	{
		path: "/api/charts/plugin/ussego.otoru/hearts",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/plugin/ussego.otoru/hearts&${PICK}&title=Hearts&${SIZE}`,
	},
	{
		path: "/api/charts/author/ussego/copies",
		src: `https://shieldcn.dev/chart/json.svg?url=${BASE}/author/ussego/copies&${PICK}&title=Copies&${SIZE}`,
	},
];

function ChartsPage() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="font-heading text-2xl">Charts</h1>
				<DitherButton
					render={
						<a href="https://github.com/ussego/omastats" target="_blank" rel="noreferrer" />
					}
					color="purple"
					bloom="aura"
				>
					<div className="flex items-center gap-2">
						<ExternalLinkIcon className="size-4" />
						<span>Source</span>
					</div>
				</DitherButton>
			</div>

			<p className="max-w-2xl text-muted-foreground">
				Embeddable chart images for catalog stats. omastats serves the time series as JSON; shieldcn renders
				the SVG from it — same division of labor as the badges.
			</p>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Live examples</h2>
				{EXAMPLES.map((e) => (
					<div
						key={e.path}
						className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-4"
					>
						<img src={e.src} alt={e.path} loading="lazy" />
						<div className="flex items-center gap-2">
							<code className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
								{e.path}
							</code>
							<CopyButton text={e.src} />
						</div>
					</div>
				))}
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Endpoints</h2>
				<Snippet>{`GET /api/charts/omastats/{published|updated|verified|total}`}</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Catalog-wide time series from <Code>plugins</Code>, <Code>update_events</Code>, and{" "}
						<Code>verification_events</Code>.
					</li>
					<li>
						<Code>total</Code> is the cumulative plugin count — it only ever rises.
					</li>
				</ul>
				<Snippet>{`GET /api/charts/plugin/{id}/{hearts|views|copies}`}</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>A single plugin's stat history, e.g. <Code>ussego.otoru</Code>.</li>
				</ul>
				<Snippet>{`GET /api/charts/author/{login}/{hearts|views|copies}`}</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>An author's total, summed across all their plugins.</li>
				</ul>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Query parameters</h2>
				<div className="flex flex-col gap-3">
					<div className="flex gap-4">
						<span className="w-32 shrink-0">
							<Code>groupBy</Code>
						</span>
						<span className="text-muted-foreground">
							Bucket size: <Code>day</Code>, <Code>month</Code>, or <Code>year</Code>. Defaults:
							<Code>day</Code> for <Code>updated</Code>/<Code>verified</Code>, <Code>month</Code> for
							<Code>published</Code>/<Code>total</Code>.
						</span>
					</div>
					<div className="flex gap-4">
						<span className="w-32 shrink-0">
							<Code>toStatus</Code>
						</span>
						<span className="text-muted-foreground">
							Filter <Code>verified</Code> events to one transition, e.g. <Code>broken</Code>.
						</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Response</h2>
				<Snippet>{`{"title": "plugins published", "total": 1553, "points": [{"date": "2026-07-01", "count": 21}, ...]}`}</Snippet>
				<p className="text-muted-foreground">
					The <Code>count</Code>/<Code>date</Code> keys are what shieldcn's <Code>query</Code> and{" "}
					<Code>dateQuery</Code> JSONPath selectors pick up.
				</p>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Rendering</h2>
				<p className="text-muted-foreground">
					Point shieldcn's chart endpoint at the JSON — it fetches it, applies the JSONPath, and renders:
				</p>
				<Snippet>
					{`https://shieldcn.dev/chart/json.svg?url=https://stats.ussego.com/api/charts/omastats/published&query=$.points[*].count&dateQuery=$.points[*].date&title=Plugins+published`}
				</Snippet>
				<p className="text-muted-foreground">
					The <Code>url</Code> must be extensionless — shieldcn's fetcher rejects dot-suffixed
					URLs, so drop the <Code>.json</Code>.
				</p>
				<p className="text-muted-foreground">Embed in markdown:</p>
				<Snippet>
					{`![new plugins](https://shieldcn.dev/chart/json.svg?url=https://stats.ussego.com/api/charts/omastats/published&query=$.points[*].count&dateQuery=$.points[*].date&title=Plugins+published)`}
				</Snippet>
			</div>
		</div>
	);
}
