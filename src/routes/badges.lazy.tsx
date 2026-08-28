/** @jsxImportSource react */
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { createLazyFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DitherButton } from "@/components/dither-kit/button";

export const Route = createLazyFileRoute("/badges")({
	component: BadgesPage,
});

// Live example badges (rendered client-side from badges.ussego.com via shieldcn).
const EXAMPLES: { path: string; src: string }[] = [
	{
		path: "/hearts/ussego.otoru",
		src: "https://shieldcn.dev/https/badges.ussego.com/hearts/ussego.otoru.svg?logo=lu%3AHeart",
	},
	{
		path: "/views/ussego.otoru",
		src: "https://shieldcn.dev/https/badges.ussego.com/views/ussego.otoru.svg?logo=lu%3AEye",
	},
	{
		path: "/copies/ussego.otoru",
		src: "https://shieldcn.dev/https/badges.ussego.com/copies/ussego.otoru.svg?logo=lu%3ACopy",
	},
	{
		path: "/views/ussego (author total)",
		src: "https://shieldcn.dev/https/badges.ussego.com/views/ussego.svg?logo=lu%3AEye",
	},
	{
		path: "/ranking/hearts/ussego.otoru",
		src: "https://shieldcn.dev/https/badges.ussego.com/ranking/hearts/ussego.otoru.svg?logo=lu%3AMedal",
	},
	{
		path: "/ranking/avg/ussego.otoru",
		src: "https://shieldcn.dev/https/badges.ussego.com/ranking/avg/ussego.otoru.svg?logo=lu%3AMedal",
	},
];

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1500);
		return () => clearTimeout(t);
	}, [copied]);
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			title={copied ? "Copied" : "Copy URL"}
			onClick={() => {
				navigator.clipboard.writeText(text);
				setCopied(true);
			}}
		>
			{copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
		</Button>
	);
}

function Code({ children }: { children: string }) {
	return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

function Snippet({ children }: { children: string }) {
	return <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">{children}</pre>;
}

function BadgesPage() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="font-heading text-2xl">Badges</h1>
				<DitherButton
					render={<a href="https://github.com/ussego/omarchy-badges" target="_blank" rel="noreferrer" />}
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
				Embeddable badges for plugin and author stats. Point a badge renderer at badges.ussego.com and it
				returns live numbers from the Omarchy plugins API.
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

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Endpoints</h2>
				<Snippet>GET /:stat/:id</Snippet>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<Code>stat</Code> is <Code>views</Code>, <Code>copies</Code>, or <Code>hearts</Code>.
					</li>
					<li>
						<Code>id</Code> is a plugin id like <Code>37signals.basecamp</Code>, or a bare author name like{" "}
						<Code>ussego</Code>. Author ids return the total across all the author's plugins.
					</li>
				</ul>
				<Snippet>GET /ranking/:stat/:id</Snippet>
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
					{`https://shieldcn.dev/https/badges.ussego.com/hearts/ussego.otoru.svg?logo=lu%3AHeart`}
				</Snippet>
				<p className="text-muted-foreground">shields.io reads the same JSON:</p>
				<Snippet>{`https://img.shields.io/endpoint?url=https://badges.ussego.com/views/ussego.otoru`}</Snippet>
			</div>
		</div>
	);
}
