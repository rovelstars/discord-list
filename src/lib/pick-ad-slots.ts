/**
 * Returns a Set of indices where ad units should be injected into a list.
 * Never picks index 0 (first) or index count-1 (last).
 * Spaces ads roughly every `approxInterval` items with ±25% deterministic jitter.
 *
 * Deterministic by design: the jitter is seeded from the list length so SSR
 * and client renders pick identical slots (Math.random caused hydration
 * mismatches). Same `count` + `approxInterval` always yields the same slots.
 */
export function pickAdSlots(count: number, approxInterval: number): Set<number> {
	const slots = new Set<number>();
	if (count <= 2) return slots;
	const jitter = Math.max(1, Math.floor(approxInterval * 0.25));
	// Deterministic PRNG (mulberry32) seeded by the list length + interval.
	let seed = ((count * 2654435761) ^ (approxInterval * 40503)) >>> 0;
	function rand() {
		seed = (seed + 0x6d2b79f5) >>> 0;
		let t = seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
	// Start somewhere between 1 and approxInterval — never position 0
	let pos = 1 + Math.floor(rand() * approxInterval);
	while (pos < count - 1) {
		slots.add(pos);
		pos += approxInterval + Math.floor(rand() * (jitter * 2 + 1)) - jitter;
	}
	return slots;
}
