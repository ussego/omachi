/** @jsxImportSource react */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

// The SSR shell ships static <title>/description for crawlers; once the router
// mounts, its per-route head must win — the browser only honors the first
// <title>, so drop the shell's copies (og: tags stay: static, no route dupes).
document.querySelector("head title")?.remove();
document.querySelector('meta[name="description"]')?.remove();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Backend responses are edge-cached for 1h; staleTime < that keeps
			// refetches cheap while avoiding redundant in-flight requests.
			staleTime: 60_000,
			retry: 1,
		},
	},
});

const router = createRouter({
	routeTree,
	context: { queryClient },
	// Native View Transitions on every navigation (cross-fade, disabled for
	// reduced-motion via CSS in style.css).
	defaultViewTransition: true,
	// The app shell is min-h-dvh so the window scrolls; the router's default
	// window scroll reset/restore applies on navigation.
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
