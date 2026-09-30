import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts", "src/**/*.test.ts"]
	}
});
