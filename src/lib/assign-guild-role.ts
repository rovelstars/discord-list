/**
 * assign-guild-role.ts
 *
 * Thin helper that assigns a Discord guild role to a member using the bot
 * token (REST API, no gateway connection needed).
 *
 * Design notes:
 *  - Always non-fatal: all errors are caught and logged; callers never fail
 *    because a role assignment failed.
 *  - Silently skips if any required env value is absent (safe for local dev
 *    where guild / role IDs may not be set).
 *  - Uses discord-api-types route helpers for type-safety and forward-compat.
 *  - Re-uses the existing RestClient factory so auth config stays in one place.
 */

import { Routes } from "discord-api-types/v10";
import RestClient from "@/bot/util";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignRoleEnv {
	DISCORD_TOKEN: string;
	DISCORD_GUILD_ID: string;
}

export interface AssignRoleOptions {
	/** Discord user snowflake to receive the role. */
	userId: string;
	/** Role snowflake to assign. */
	roleId: string;
	env: AssignRoleEnv;
	/** Optional human-readable label used in log lines only. */
	label?: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Attempt to add `roleId` to `userId` in the configured guild.
 *
 * Returns `true` when the role was successfully assigned (or was already
 * present — Discord returns 204 in both cases), `false` on any failure.
 *
 * Never throws.
 */
export async function assignGuildRole(opts: AssignRoleOptions): Promise<boolean> {
	const { userId, roleId, label = "role" } = opts;
	const { DISCORD_TOKEN, DISCORD_GUILD_ID } = opts.env;

	// Guard: silently skip if configuration is incomplete.
	if (!DISCORD_TOKEN || !DISCORD_GUILD_ID || !roleId || !userId) {
		return false;
	}

	try {
		const rest = RestClient({ DISCORD_TOKEN });
		// PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}
		// Discord returns 204 No Content on success (member already has the role
		// also yields 204, so this is idempotent).
		await rest.put(Routes.guildMemberRole(DISCORD_GUILD_ID, userId, roleId));
		console.log(
			`[assign-guild-role] Assigned ${label} (${roleId}) to user ${userId} in guild ${DISCORD_GUILD_ID}`
		);
		return true;
	} catch (err) {
		// 403 → bot lacks MANAGE_ROLES or its top role is too low.
		// 404 → user is not a member of the guild (they haven't joined yet —
		//        this is the expected case; the role will be assigned on their
		//        next login once they are in the server).
		// Any other error → transient Discord API issue.
		const status = (err as any)?.status ?? (err as any)?.rawError?.code ?? "?";
		console.warn(
			`[assign-guild-role] Could not assign ${label} (${roleId}) to user ${userId}: HTTP ${status}`,
			err instanceof Error ? err.message : err
		);
		return false;
	}
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Grant the "user" role to a member who has an account on the website.
 * No-ops when `DISCORD_USER_ROLE` is not set.
 */
export async function assignUserRole(
	userId: string,
	env: AssignRoleEnv & { DISCORD_USER_ROLE?: string }
): Promise<boolean> {
	const roleId = env.DISCORD_USER_ROLE;
	if (!roleId) return false;
	return assignGuildRole({ userId, roleId, env, label: "user-role" });
}

/**
 * Grant the "botdev" role to a member who has published a bot on the website.
 * No-ops when `DISCORD_BOTDEV_ROLE` is not set.
 */
export async function assignBotdevRole(
	userId: string,
	env: AssignRoleEnv & { DISCORD_BOTDEV_ROLE?: string }
): Promise<boolean> {
	const roleId = env.DISCORD_BOTDEV_ROLE;
	if (!roleId) return false;
	return assignGuildRole({ userId, roleId, env, label: "botdev-role" });
}
