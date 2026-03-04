import type { Plugin } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

const DOCS_DIR = resolve(import.meta.dirname, ".");
const VIRTUAL_ID = "virtual:docs";
const RESOLVED_VIRTUAL_ID = "\0" + VIRTUAL_ID;

export interface DocSection {
	/** filename slug, e.g. "introduction", "bots" */
	slug: string;
	/** First h1 from the markdown, e.g. "Introduction" */
	title: string;
	/** Rendered HTML string */
	html: string;
}

function buildMarked(): Marked {
	return new Marked(
		markedHighlight({
			emptyLangClass: "hljs",
			langPrefix: "hljs language-",
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : "plaintext";
				return hljs.highlight(code, { language }).value;
			}
		})
	);
}

function readDocs(): DocSection[] {
	const marked = buildMarked();

	const files = readdirSync(DOCS_DIR)
		.filter((f) => f.endsWith(".md"))
		.sort(); // relies on numeric prefix: 01-*, 02-*, …

	return files.map((file) => {
		const raw = readFileSync(resolve(DOCS_DIR, file), "utf-8");
		const html = marked.parse(raw) as string;

		// Extract title from first h1 (# …) in the markdown source
		const titleMatch = raw.match(/^#\s+(.+)$/m);
		const title = titleMatch ? titleMatch[1].trim() : file;

		// slug: strip numeric prefix and .md - "01-introduction.md" → "introduction"
		const slug = basename(file, ".md").replace(/^\d+-/, "");

		return { slug, title, html };
	});
}

export function docsPlugin(): Plugin {
	let isDev = false;

	return {
		name: "vite-plugin-docs",

		configResolved(config) {
			isDev = config.command === "serve";
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
		},

		load(id) {
			if (id !== RESOLVED_VIRTUAL_ID) return;

			// In dev: read + parse on every load (hot reload for free).
			// In build: read + parse once - Rollup inlines the result as a
			// static JS module so zero markdown processing happens at runtime.
			const sections = readDocs();
			return `export const docs = ${JSON.stringify(sections)};`;
		},

		// In dev, invalidate the virtual module whenever any .md file changes
		// so HMR triggers a page reload with fresh content.
		handleHotUpdate({ file, server }) {
			if (isDev && file.endsWith(".md") && file.startsWith(DOCS_DIR)) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
				if (mod) server.moduleGraph.invalidateModule(mod);
				server.hot.send({ type: "full-reload" });
			}
		}
	};
}
