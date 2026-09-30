import { describe, expect, it } from "vitest";
import { extractInviteCode } from "$lib/server/resolve-support";

describe("extractInviteCode", () => {
	it("accepts full discord.gg URLs", () => {
		expect(extractInviteCode("https://discord.gg/abcXYZ")).toBe("abcXYZ");
		expect(extractInviteCode("http://discord.gg/abcXYZ")).toBe("abcXYZ");
		expect(extractInviteCode("discord.gg/abcXYZ")).toBe("abcXYZ");
		expect(extractInviteCode("www.discord.gg/abcXYZ")).toBe("abcXYZ");
	});

	it("accepts discord.com / discordapp.com invite URLs", () => {
		expect(extractInviteCode("https://discord.com/invite/abc123")).toBe("abc123");
		expect(extractInviteCode("discord.com/invite/abc123")).toBe("abc123");
		expect(extractInviteCode("https://discordapp.com/invite/abc123")).toBe("abc123");
	});

	it("accepts codes with dashes and trailing slash / query / hash", () => {
		expect(extractInviteCode("https://discord.gg/my-code-123")).toBe("my-code-123");
		expect(extractInviteCode("https://discord.gg/abc123/")).toBe("abc123");
		expect(extractInviteCode("https://discord.gg/abc123?foo=bar")).toBe("abc123");
		expect(extractInviteCode("https://discord.gg/abc123#section")).toBe("abc123");
	});

	it("accepts bare codes", () => {
		expect(extractInviteCode("abc123")).toBe("abc123");
		expect(extractInviteCode("my-code-99")).toBe("my-code-99");
	});

	it("rejects lookalike / hijack URLs", () => {
		expect(extractInviteCode("discord.gg/code.evil.com/x")).toBeNull();
		expect(extractInviteCode("code.tracker.me/discord")).toBeNull();
		expect(extractInviteCode("https://evil.com/discord.gg/abc")).toBeNull();
		expect(extractInviteCode("https://discord.gg.evil.com/abc")).toBeNull();
	});

	it("rejects null, empty, and whitespace", () => {
		expect(extractInviteCode(null)).toBeNull();
		expect(extractInviteCode(undefined)).toBeNull();
		expect(extractInviteCode("")).toBeNull();
		expect(extractInviteCode("   ")).toBeNull();
	});

	it("rejects values with extra path segments or illegal chars", () => {
		expect(extractInviteCode("https://discord.gg/abc/extra")).toBeNull();
		expect(extractInviteCode("abc def")).toBeNull();
		expect(extractInviteCode("abc/def")).toBeNull();
	});
});
