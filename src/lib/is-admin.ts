import { env } from "$env/dynamic/private";

/**
 * Checks whether a Discord user ID is listed in the ADMINS environment variable.
 *
 * ADMINS is a comma-separated string of Discord user IDs.
 * Returns `true` when the given `userId` appears in that list.
 */
export function isAdmin(userId: string): boolean {
	const raw = env.ADMINS;
	if (!raw) return false;
	const admins = raw.split(",").map((id) => id.trim()).filter(Boolean);
	return admins.includes(userId);
}
