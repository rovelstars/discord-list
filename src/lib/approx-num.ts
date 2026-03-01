// Simple approximate number formatter (replacement for approximate-number)
export default function approx(n: number | null | undefined): string {
	if (n == null || isNaN(Number(n))) return "0";
	const num = Number(n);
	if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
	if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "k";
	return String(num);
}
