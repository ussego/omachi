import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
	plugins: [tanstackRouter(), cloudflare(), ssrPlugin(), tailwindcss()],
	resolve: {
		tsconfigPaths: true,
	},
});
