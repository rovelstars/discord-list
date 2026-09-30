/**
 * Shared cached twemoji loader.
 *
 * TwemojiText instances previously each ran their own dynamic
 * `import("twemoji")`. This module loads it once and shares the
 * parsed module across every instance on the page.
 *
 * SSR parity: SSR still renders raw unicode text (twemoji only runs
 * in onMount on the client), so server and client HTML match and the
 * client parse is a pure enhancement.
 */

type TwemojiModule = {
	parse: (node: Element, options?: Record<string, unknown>) => void;
};

let promise: Promise<TwemojiModule | null> | null = null;

export function ensureTwemoji(): Promise<TwemojiModule | null> {
	if (!promise) {
		promise = import("twemoji").then(
			(mod) => ((mod as any).default ?? mod) as TwemojiModule,
			() => null
		);
	}
	return promise;
}

/** Fast pre-check so nodes without emoji skip the parse entirely. */
export function containsEmoji(text: string): boolean {
	try {
		return /\p{Extended_Pictographic}/u.test(text);
	} catch {
		// Older engines without unicode property escapes - assume emoji present.
		return true;
	}
}
