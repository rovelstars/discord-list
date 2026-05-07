/**
 * Forward server-side errors to a Discord webhook so they show up in the
 * dev channel without needing to dig through Netlify function logs.
 *
 * Designed to be cheap on Netlify's free tier:
 *  - No-op when DISCORD_ERROR_WEBHOOK_URL is unset (dev/preview = zero cost).
 *  - 60-second in-memory dedup keyed by error fingerprint, so a hot loop
 *    sends one webhook per minute instead of one per occurrence.
 *  - Hard cap of MAX_PER_MINUTE reports per warm process; once tripped,
 *    further calls drop silently until the window resets.
 *  - Never throws. A failing webhook (rate-limit, network, etc.) is
 *    swallowed so we can't recurse or break the calling code path.
 *  - Always console.errors locally too, so Netlify's own logs still capture
 *    everything for free.
 *
 * Survives across warm-container reuse (Maps/counters live in module scope)
 * and resets on cold start. That's exactly what we want — a fresh container
 * has no recent dedup state and its first report is always sent.
 */

import { env } from "$env/dynamic/private";

const DEDUP_WINDOW_MS = 60_000;
const MAX_DEDUP_ENTRIES = 200;
const MAX_PER_MINUTE = 10;
const MAX_CONTENT_LEN = 1900;

const dedup = new Map<string, number>();
let windowStart = 0;
let countInWindow = 0;

function fingerprint(tag: string, err: unknown): string {
	const msg = err instanceof Error ? err.message : String(err);
	const stackTop =
		err instanceof Error && err.stack ? (err.stack.split("\n", 2)[1]?.trim() ?? "") : "";
	return `${tag}|${msg}|${stackTop}`;
}

/**
 * Walk the Error.cause chain (up to maxDepth links) and return a flat string
 * with one block per level. Drizzle wraps libsql errors as
 * `new Error("Failed query: ...", { cause: realError })`, so without this we
 * only ever see the generic wrapper and never the actual network/auth/timeout
 * reason underneath.
 */
function formatErrorChain(err: unknown, maxDepth = 4): string {
	const blocks: string[] = [];
	let cur: unknown = err;
	let depth = 0;
	const seen = new Set<unknown>();

	while (cur && depth < maxDepth && !seen.has(cur)) {
		seen.add(cur);
		const isErr = cur instanceof Error;
		const label = depth === 0 ? "" : `\n— caused by —\n`;
		const msg = isErr ? (cur as Error).message : String(cur);
		const stack = isErr && (cur as Error).stack ? `\n${(cur as Error).stack}` : "";
		blocks.push(`${label}${msg}${stack}`);
		cur = isErr ? (cur as Error & { cause?: unknown }).cause : undefined;
		depth++;
	}

	return blocks.join("");
}

/**
 * Report an error: log locally, then (if configured) post a single Discord
 * message. `tag` should be a short, fingerprintable label - it's what the
 * dedup key is built from, so dynamic values (request ids, timestamps) inside
 * the tag will defeat dedup.
 */
export async function reportError(tag: string, err: unknown): Promise<void> {
	// Local log always - that part is free and Netlify already collects it.
	console.error(tag, err);

	const url = (env.DISCORD_ERROR_WEBHOOK_URL ?? "").trim();
	if (!url) return;

	const now = Date.now();

	// Reset the per-minute counter if the window rolled over.
	if (now - windowStart > 60_000) {
		windowStart = now;
		countInWindow = 0;
	}
	if (countInWindow >= MAX_PER_MINUTE) return;

	// Dedup: skip if we sent this fingerprint within the last DEDUP_WINDOW_MS.
	const fp = fingerprint(tag, err);
	const lastSent = dedup.get(fp);
	if (lastSent && now - lastSent < DEDUP_WINDOW_MS) return;

	// Cap dedup map size to bound memory in long-lived warm containers.
	// Drop the older half when we hit the cap (cheap and good-enough LRU).
	if (dedup.size >= MAX_DEDUP_ENTRIES) {
		const entries = [...dedup.entries()].sort((a, b) => a[1] - b[1]);
		dedup.clear();
		for (const [k, v] of entries.slice(entries.length >> 1)) dedup.set(k, v);
	}
	dedup.set(fp, now);
	countInWindow++;

	const msg = err instanceof Error ? err.message : String(err);
	const chain = formatErrorChain(err);

	let content = `🔥 **${tag}** — ${msg}\n\`\`\`\n${chain}\n\`\`\``;
	if (content.length > MAX_CONTENT_LEN) {
		content = content.slice(0, MAX_CONTENT_LEN - 5) + "…\n```";
	}

	try {
		await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content })
		});
	} catch {
		// Webhook failed - never throw from the reporter or we'll loop.
	}
}
