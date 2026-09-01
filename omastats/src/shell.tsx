/**
 * Static pre-JS shell rendered by the Worker into `#root`.
 *
 * The client mounts with createRoot(), which wipes this markup and replaces it
 * with the interactive app. The shell must therefore mirror the client's
 * first paint (header + page title + skeletons, same classes) so the swap is
 * invisible; without it, first paint would wait for the whole JS bundle.
 */
const NAV = [
	{ href: "/leaderboards", label: "Leaderboards" },
	{ href: "/health", label: "Ecosystem Health" },
	{ href: "/categories", label: "Categories" },
	{ href: "/badges", label: "Badges" },
] as const;

function routeTitle(path: string): string {
	if (path === "/") return "Overview";
	const plugin = path.match(/^\/plugins\/([^/]+)/)?.[1];
	if (plugin) return plugin;
	const author = path.match(/^\/authors\/([^/]+)/)?.[1];
	if (author) return author;
	return NAV.find((n) => path.startsWith(n.href))?.label ?? "omastats";
}

export function Shell({ path }: { path: string }) {
	return (
		<div className="flex min-h-dvh flex-col">
			<header className="sticky top-0 z-40 shrink-0">
				<div className="mx-auto w-full max-w-5xl">
					<div className="mx-4 flex h-14 items-center gap-4 rounded-b-xl border border-t-0 bg-background/80 px-4 backdrop-blur sm:mx-6">
						<a href="/" className="font-heading text-lg tracking-tight">
							omastats
						</a>
						<nav className="hidden flex-1 items-center gap-1 whitespace-nowrap text-sm lg:flex">
							{NAV.map((n) => (
								<a
									key={n.href}
									href={n.href}
									className={`rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground ${
										path.startsWith(n.href) ? "font-medium text-foreground" : "text-muted-foreground"
									}`}
								>
									{n.label}
								</a>
							))}
						</nav>
						<div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
							{/* Mirrors the header's icon buttons (theme, command, GitHub, sponsor, menu). */}
							<span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-lg border sm:size-7" />
							<span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-lg border sm:size-7" />
							<span aria-hidden="true" className="hidden size-8 items-center justify-center rounded-lg border sm:size-7 lg:inline-flex" />
							<span aria-hidden="true" className="hidden size-8 items-center justify-center rounded-lg border sm:size-7 lg:inline-flex" />
							<span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-lg border sm:size-7 lg:hidden" />
						</div>
					</div>
				</div>
			</header>
			<main className="flex flex-1 flex-col">
				<div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
					<div className="flex flex-col gap-8">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<h1 className="font-heading text-2xl">{routeTitle(path)}</h1>
								<p className="text-muted-foreground text-sm">Loading live data…</p>
							</div>
							{path === "/" && (
								<div className="flex flex-wrap items-center gap-2" aria-hidden="true">
									<span className="inline-flex h-7 items-center gap-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground text-xs">
										<span className="rounded-md bg-background px-2 py-0.5">Day</span>
										<span className="px-2 py-0.5">Month</span>
										<span className="px-2 py-0.5">Year</span>
									</span>
									<span className="h-5 w-px bg-border" />
									<span className="inline-flex h-7 items-center gap-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground text-xs">
										<span className="rounded-md bg-background px-2 py-0.5">30d</span>
										<span className="px-2 py-0.5">90d</span>
										<span className="px-2 py-0.5">365d</span>
										<span className="px-2 py-0.5">All</span>
									</span>
								</div>
							)}
						</div>
						<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
							<div className="h-24 animate-pulse rounded-lg border bg-muted/50" />
							<div className="h-24 animate-pulse rounded-lg border bg-muted/50" />
							<div className="h-24 animate-pulse rounded-lg border bg-muted/50" />
							<div className="h-24 animate-pulse rounded-lg border bg-muted/50" />
						</div>
						<div className="grid gap-8 lg:grid-cols-2">
							<div className="h-56 animate-pulse rounded-lg bg-muted" />
							<div className="h-56 animate-pulse rounded-lg bg-muted" />
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
