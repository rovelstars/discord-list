/**
 * Returns a Set of indices where ad units should be injected into a list.
 * Never picks index 0 (first) or index count-1 (last).
 * Spaces ads roughly every `approxInterval` items with ±25% random jitter.
 */
export function pickAdSlots(count: number, approxInterval: number): Set<number> {
	const slots = new Set<number>();
	if (count <= 2) return slots;
	const jitter = Math.max(1, Math.floor(approxInterval * 0.25));
	// Start somewhere between 1 and approxInterval — never position 0
	let pos = 1 + Math.floor(Math.random() * approxInterval);
	while (pos < count - 1) {
		slots.add(pos);
		pos += approxInterval + Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
	}
	return slots;
}
