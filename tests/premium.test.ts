import { describe, expect, it } from "vitest";
import {
	ECONOMY,
	canAfford,
	premiumWeekExpiry,
	extendPremiumExpiry,
	isPremiumActive
} from "$lib/economy";

describe("premium pricing", () => {
	it("costs R$ 1000 for 1 week", () => {
		expect(ECONOMY.PREMIUM_WEEK_COST).toBe(1000);
		expect(ECONOMY.PREMIUM_WEEK_DAYS).toBe(7);
		expect(canAfford(1000, ECONOMY.PREMIUM_WEEK_COST)).toBe(true);
		expect(canAfford(999, ECONOMY.PREMIUM_WEEK_COST)).toBe(false);
	});
});

describe("premium expiry", () => {
	it("sets expiry exactly 7 days out", () => {
		const from = new Date("2026-09-30T00:00:00.000Z");
		expect(premiumWeekExpiry(from, 1)).toBe("2026-10-07T00:00:00.000Z");
	});

	it("extends an active pin from its current expiry", () => {
		const now = new Date("2026-09-30T00:00:00.000Z");
		const out = extendPremiumExpiry("2026-10-05T00:00:00.000Z", 1, now);
		expect(out).toBe("2026-10-12T00:00:00.000Z");
	});

	it("restarts from now when the pin already expired", () => {
		const now = new Date("2026-09-30T00:00:00.000Z");
		const out = extendPremiumExpiry("2026-09-01T00:00:00.000Z", 1, now);
		expect(out).toBe("2026-10-07T00:00:00.000Z");
	});

	it("treats future timestamps active, past expired, NULL legacy active", () => {
		const now = new Date("2026-09-30T00:00:00.000Z");
		expect(isPremiumActive("2026-10-01T00:00:00.000Z", now)).toBe(true);
		expect(isPremiumActive("2026-09-29T00:00:00.000Z", now)).toBe(false);
		expect(isPremiumActive(null, now)).toBe(true);
	});
});
