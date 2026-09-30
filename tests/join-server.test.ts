import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/assign-guild-role", () => ({
	assignUserRole: vi.fn().mockResolvedValue(true)
}));

import joinServer from "$lib/functions/join-server";
import { assignUserRole } from "$lib/assign-guild-role";

const ENV = {
	DISCORD_GUILD_ID: "guild-1",
	DISCORD_BOT_ID: "bot-999",
	DISCORD_TOKEN: "token",
	DISCORD_USER_ROLE: "role-1"
};

describe("joinServer (regression: must act on the user, not the bot)", () => {
	it("passes the authenticated userId to addMember, not the bot id", async () => {
		const oauth = { addMember: vi.fn().mockResolvedValue({ ok: true }) };
		await joinServer({ oauth: oauth as any, token: "user-token", userId: "user-123", env: ENV });

		expect(oauth.addMember).toHaveBeenCalledOnce();
		const args = oauth.addMember.mock.calls[0][0];
		expect(args.userId).toBe("user-123");
		expect(args.userId).not.toBe(ENV.DISCORD_BOT_ID);
		expect(args).toMatchObject({
			accessToken: "user-token",
			guildId: ENV.DISCORD_GUILD_ID,
			botToken: ENV.DISCORD_TOKEN
		});
	});

	it("assigns the role to the user, not the bot", async () => {
		const oauth = { addMember: vi.fn().mockResolvedValue({ ok: true }) };
		await joinServer({ oauth: oauth as any, token: "user-token", userId: "user-123", env: ENV });

		expect(assignUserRole).toHaveBeenCalledWith("user-123", expect.anything());
	});
});
