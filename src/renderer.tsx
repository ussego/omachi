import { jsxRenderer } from "hono/jsx-renderer";
import { raw } from "hono/html";
import type { Context } from "hono";
import { Link, Script, ViteClient } from "vite-ssr-components/hono";

const SITE = "omastats";
const SITE_TITLE = "omastats — Analytics for the Omarchy plugin catalog";
const SITE_DESC =
	"Live analytics for the Omarchy plugin catalog: hearts, views, copies, leaderboards, ecosystem health, categories, and embeddable badges.";

/** Runs before first paint to avoid a theme flash; static string, no input. */
const themeInit = raw(
	`(() => { const saved = localStorage.getItem("theme"); const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; if (dark) document.documentElement.classList.add("dark"); })()`,
);

/**
 * SSR shell. Static meta is the crawler-facing baseline (scrapers read this
 * HTML without running JS); the client strips the title/description on
 * hydration so TanStack Router's per-route head takes over (see client.tsx).
 * `og:image` and the favicon are generated into public/ by `bun run assets`
 * (takumi, build-time) — see scripts/assets.tsx.
 */
export const renderer = jsxRenderer(({ children }, c: Context) => {
	const url = new URL(c.req.url);
	return (
		<html lang="en">
			<head>
				<script>{themeInit}</script>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{SITE_TITLE}</title>
				<meta name="description" content={SITE_DESC} />
				<link rel="canonical" href={url.toString()} />
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<meta property="og:type" content="website" />
				<meta property="og:site_name" content={SITE} />
				<meta property="og:title" content={SITE_TITLE} />
				<meta property="og:description" content={SITE_DESC} />
				<meta property="og:url" content={url.toString()} />
				<meta property="og:image" content={`${url.origin}/og.png`} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:title" content={SITE_TITLE} />
				<meta name="twitter:description" content={SITE_DESC} />
				<meta name="twitter:image" content={`${url.origin}/og.png`} />
				<ViteClient />
				<Script src="/src/client.tsx" />
				<Link href="/src/style.css" rel="stylesheet" />
			</head>
			<body>{children}</body>
		</html>
	);
});
