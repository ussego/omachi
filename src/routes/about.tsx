/** @jsxImportSource react */

import { IconExternalLink } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { GraphRule } from "@/components/graph-frame/graph-rule";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
	head: () => ({
		meta: [
			{ title: "About · Omachi" },
			{
				name: "description",
				content:
					"Omachi is an independent companion dashboard for the Omarchy plugin catalog: data sources, permissions, and credits.",
			},
		],
	}),
	component: AboutPage,
});

function AboutPage() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="font-heading text-2xl">About</h1>
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
				Omachi is an independent companion dashboard for the Omarchy plugin catalog. It tracks every plugin in the
				catalog and charts publishes, updates, verification events, and usage over time. Omachi is not affiliated
				with Omarchy, Basecamp, or the catalog maintainers.
			</p>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Data sources</h2>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						Plugin catalog and explorer graph come from the{" "}
						<a
							href="https://plugins.omarchy.org"
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-4 hover:no-underline"
						>
							omarchy plugin marketplace
						</a>
						, published under the MIT license.
					</li>
					<li>Views, copies, and hearts come from the marketplace's stats API, included with the maintainer's permission.</li>
					<li>Snapshots run every six hours and keep 90 days of history; new plugins appear within 30 minutes.</li>
				</ul>
			</div>

			<GraphRule />

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">Credits</h2>
				<ul className="list-inside list-disc text-muted-foreground">
					<li>
						<a
							href="https://github.com/basecamp/omarchy"
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-4 hover:no-underline"
						>
							Omarchy
						</a>{" "}
						(MIT): the color themes in the header picker are generated from Omarchy's built-in themes.
					</li>
					<li>
						The{" "}
						<a
							href="https://plugins.omarchy.org"
							target="_blank"
							rel="noreferrer"
							className="underline underline-offset-4 hover:no-underline"
						>
							omarchy plugin marketplace
						</a>
						: catalog and explorer data.
					</li>
				</ul>
			</div>

			<div className="flex flex-col gap-3">
				<h2 className="font-heading text-xl">License</h2>
				<p className="text-muted-foreground">
					Omachi's code is{" "}
					<a
						href="https://github.com/ussego/omachi/blob/main/LICENSE"
						target="_blank"
						rel="noreferrer"
						className="underline underline-offset-4 hover:no-underline"
					>
						MIT licensed
					</a>
					.
				</p>
			</div>
		</div>
	);
}
