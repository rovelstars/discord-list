/**
 * Shared lazy ColorThief singleton.
 *
 * BotCard / ServerCard previously each did their own dynamic
 * `import("colorthief")` + `new ColorThief()` per card instance
 * (180+ instances on the homepage background marquee). This module
 * loads the library once and reuses the single instance everywhere.
 */
let promise: Promise<{
	getColor: (img: HTMLImageElement) => number[];
} | null> | null = null;

export function getColorThief(): Promise<{
	getColor: (img: HTMLImageElement) => number[];
} | null> {
	if (!promise) {
		promise = import("colorthief").then(
			(mod) => {
				try {
					const CT = (mod as any).default ?? mod;
					return new CT() as { getColor: (img: HTMLImageElement) => number[] };
				} catch {
					return null;
				}
			},
			() => null
		);
	}
	return promise;
}
