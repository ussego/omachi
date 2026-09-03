/** @jsxImportSource react */

import { IconExternalLink } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { Code, CopyButton, Snippet } from "@/components/snippet";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/badges")({
	head: () =>
		pageHead(
			"Omarchy Plugin Badges · Omachi",
			"Add live Omarchy plugin and author badges for hearts, views, copies, and catalog rankings using Omachi's public badge endpoints.",
			"/badges",
		),
	component: BadgesPage,
});

// Live example badges (rendered client-side from stats.ussego.com/api/badges via shieldcn).
const EXAMPLES: { path: string; src: string }[] = [
	{
		path: "/api/badges/hearts/ussego.otoru",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/hearts/ussego.otoru.svg?logo=lu%3AHeart",
	},
	{
		path: "/api/badges/views/ussego.otoru",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/views/ussego.otoru.svg?logo=lu%3AEye",
	},
	{
		path: "/api/badges/copies/ussego.otoru",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/copies/ussego.otoru.svg?logo=lu%3ACopy",
	},
	{
		path: "/api/badges/views/ussego (author total)",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/views/ussego.svg?logo=lu%3AEye",
	},
	{
		path: "/api/badges/ranking/hearts/ussego.otoru",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/ranking/hearts/ussego.otoru.svg?logo=lu%3AMedal",
	},
	{
		path: "/api/badges/ranking/avg/ussego.otoru",
		src: "https://shieldcn.dev/https/stats.ussego.com/api/badges/ranking/avg/ussego.otoru.svg?logo=lu%3AMedal",
	},
];

function BadgesPage() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="font-heading text-2xl">Omarchy Plugin Badges</h1>
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
				Embeddable badges for plugin and author stats. Point a badge renderer at stats.ussego.com/api/badges and
				it returns live numbers from Omachi's mirrored catalog data.
			</p>

			<div className="flex flex-col gap-4">
				<h2 className="font-heading text-xl">Live examples</h2>
				<Table variant="card">
					<TableHeader>
						<TableRow>
							<TableHead>Badge</TableHead>
							<TableHead>Endpoint</TableHead>
							<TableHead className="text-right">Copy</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{EXAMPLES.map((e) => (
							<TableRow key={e.path}>
								<TableCell>
									<img src={e.src} alt={e.path} className="h-6 w-auto" loading="lazy" />
								</TableCell>
								<TableCell className="font-mono text-muted-foreground text-xs">{e.path}</TableCell>
								<TableCell className="text-right">
									<CopyButton text={e.src} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Endpoints</h2>
				<Snippet>GET /api/badges/:stat/:id</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<Code>stat</Code> is <Code>views</Code>, <Code>copies</Code>, or <Code>hearts</Code>.
					</li>
					<li>
						<Code>id</Code> is a plugin id like <Code>37signals.basecamp</Code>, or a bare author name like{" "}
						<Code>ussego</Code>. Author ids return the total across all the author's plugins.
					</li>
				</ul>
				<Snippet>GET /api/badges/ranking/:stat/:id</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Same stats, plus <Code>avg</Code> (the mean of views, copies, and hearts).
					</li>
					<li>Ranking is competition style: 1 is highest, ties share a place.</li>
				</ul>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Query parameters</h2>
				<div className="flex flex-col gap-3">
					<div className="flex gap-4">
						<span className="w-32 shrink-0">
							<Code>label</Code>
						</span>
						<span className="text-muted-foreground">
							Text on the left side of the badge. Defaults to the stat name, capitalized.
						</span>
					</div>
					<div className="flex gap-4">
						<span className="w-32 shrink-0">
							<Code>color</Code>
						</span>
						<span className="text-muted-foreground">
							Badge color. Defaults per stat: hearts red, views blue, copies green.
						</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Rendering</h2>
				<p className="text-muted-foreground">
					The response is a shields.io endpoint schema, so any badge renderer works.
				</p>
				<Snippet>{`{"schemaVersion": 1, "label": "Views", "message": "109", "color": "blue"}`}</Snippet>
				<p className="text-muted-foreground">shieldcn, with styling via its own query params:</p>
				<Snippet>
					{`https://shieldcn.dev/https/stats.ussego.com/api/badges/hearts/ussego.otoru.svg?logo=lu%3AHeart`}
				</Snippet>
				<p className="text-muted-foreground">shields.io reads the same JSON:</p>
				<Snippet>{`https://img.shields.io/endpoint?url=https://stats.ussego.com/api/badges/views/ussego.otoru`}</Snippet>
			</div>
		</div>
	);
}
