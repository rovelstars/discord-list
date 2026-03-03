import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { docsPlugin } from "./src/lib/docs/vite-plugin-docs.ts";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), docsPlugin()],
	server: {
		allowedHosts: true
	}
});
