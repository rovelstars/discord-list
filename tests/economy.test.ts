import { describe, expect, it } from "vitest";
import {
	ECONOMY,
	calcStreak,
	checkinRewardForStreak,
	payableVotesToday,
	voteEarnForCount,
	isProfileComplete,
	spendCost,
	canAfford,
	toDayKey,
	shiftDayKey
} from "$lib/economy";

describe("calcStreak", () => {
	it("counts consecutive days ending today", () => {
		expect(calcStreak(["2026-09-28", "2026-09-29", "2026-09-30"], "2026-09-30")).toBe(3);
	});

	it("tolerates a missing today when yesterday is present (alive streak)", () => {
		expect(calcStreak(["2026-09-28", "2026-09-29"], "2026-09-30")).toBe(2);
	});

	it("breaks on a gap and returns 0 when both today and yesterday are missing", () => {
		expect(calcStreak(["2026-09-27", "2026-09-29", "2026-09-30"], "2026-09-30")).toBe(2);
		expect(calcStreak(["2026-09-20"], "2026-09-30")).toBe(0);
		expect(calcStreak([], "2026-09-30")).toBe(0);
	});
});

describe("checkinRewardForStreak", () => {
	it("pays base on day 1 and adds the streak bonus per extra day", () => {
		expect(checkinRewardForStreak(1)).toBe(ECONOMY.CHECKIN_BASE);
		expect(checkinRewardForStreak(3)).toBe(
			ECONOMY.CHECKIN_BASE + 2 * ECONOMY.CHECKIN_STREAK_BONUS
		);
	});

	it("caps the daily payout and pays nothing for non-positive streaks", () => {
		expect(checkinRewardForStreak(100)).toBe(ECONOMY.CHECKIN_DAILY_CAP);
		expect(checkinRewardForStreak(0)).toBe(0);
		expect(checkinRewardForStreak(-1)).toBe(0);
	});
});

describe("vote-earn caps", () => {
	it("limits payable votes to the daily max minus already-paid rows", () => {
		expect(payableVotesToday(3, 0)).toBe(3);
		expect(payableVotesToday(10, 0)).toBe(ECONOMY.VOTE_EARN_DAILY_MAX);
		expect(payableVotesToday(10, 4)).toBe(1);
		expect(payableVotesToday(10, 5)).toBe(0);
		expect(payableVotesToday(0, 0)).toBe(0);
	});

	it("prices votes at the flat earn rate", () => {
		expect(voteEarnForCount(5)).toBe(5 * ECONOMY.VOTE_EARN);
		expect(voteEarnForCount(0)).toBe(0);
	});
});

describe("bounties and spends", () => {
	it("requires a custom bio AND a banner for profile completeness", () => {
		expect(isProfileComplete("Hello world", "https://example.com/b.png")).toBe(true);
		expect(isProfileComplete("The user doesn't have bio set!", "https://example.com/b.png")).toBe(
			false
		);
		expect(isProfileComplete("Hello world", null)).toBe(false);
		expect(isProfileComplete("", "")).toBe(false);
		expect(isProfileComplete(null, null)).toBe(false);
	});

	it("resolves known spend costs and rejects unknown kinds", () => {
		expect(spendCost("profile_border")).toBe(ECONOMY.SPENDS.profile_border);
		expect(spendCost("listing_accent")).toBe(ECONOMY.SPENDS.listing_accent);
		expect(spendCost("rising_slot")).toBe(ECONOMY.SPENDS.rising_slot);
		expect(spendCost("buy_votes")).toBe(null);
		expect(spendCost("")).toBe(null);
	});

	it("never approves unaffordable or non-positive costs", () => {
		expect(canAfford(50, 100)).toBe(false);
		expect(canAfford(100, 100)).toBe(true);
		expect(canAfford(0, 0)).toBe(false);
	});
});

describe("day keys", () => {
	it("round-trips UTC day keys", () => {
		expect(toDayKey(new Date("2026-09-30T02:00:00.000Z"))).toBe("2026-09-30");
		expect(shiftDayKey("2026-09-30", -1)).toBe("2026-09-29");
		expect(shiftDayKey("2026-09-30", 1)).toBe("2026-10-01");
	});
});
