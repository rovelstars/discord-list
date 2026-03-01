import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ edge: true }),
		alias: {
			"@": "./src"
		}
	}
};

export default config;
