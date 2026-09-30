/**
 * user-refresh.ts
 *
 * Lazily re-sync a user's Discord identity (username, global name, discriminator,
 * avatar) into the Users table. This mirrors the bot/server refresh pattern
 * (see `bot-refresh.ts` / `server-refresh.ts`): identity is only written at
 * account creation and on demand here, so without this a user's avatar/name on
 * their /users/[id] profile would go stale the moment they change it on Discord.
 *
 * Deliberately does NOT touch user-editable columns (`bio`, `banner`) - those
 * are owned by the dashboard, not Discord. `accent_color` is left alone too.
 *
 * Staleness is gated by the `Users.synced_at` timestamp, exactly like
 * `Servers.synced_at` gates `refreshServer`.
 */
import { withDb } from "$lib/db";
import { Users } from "$lib/db/schema";
import { eq } from "drizzle-orm";

export interface UserRefreshOptions {
	/** Skip the refresh when the row was synced more recently than this many ms. */
	minAgeMs?: number;
	/** Free-form label for logs (e.g. "profile-page-load"). */
	triggeredBy?: string;
}

export interface UserRefreshResult {
	userId: string;
	updated: boolean;
	skipped: boolean;
	changes: string[];
}

interface DiscordUser {
	id: string;
	username: string;
	discriminator?: string | null;
	avatar?: string | null;
	global_name?: string | null;
	/** Raw banner hash - bot tokens always return null here (banner is user-token only). */
	banner?: string | null;
	/** Accent colour as an integer; this IS returned by a bot token. */
	accent_color?: number | null;
}

/** Default 24h - identity changes are rare, so don't hammer Discord per view. */
const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;

async function fetchDiscordUser(id: string, botToken: string): Promise<DiscordUser> {
	const res = await fetch(`https://discord.com/api/v10/users/${encodeURIComponent(id)}`, {
		headers: {
			Authorization: `Bot ${botToken}`,
			"User-Agent": "discord-list/infra"
		},
		// Hard cap so a slow Discord response can't hang the awaited profile load.
		signal: AbortSignal.timeout(4000)
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "(unreadable)");
		throw new Error(`Discord GET /users/${id} returned HTTP ${res.status}: ${text}`);
	}
	return res.json() as Promise<DiscordUser>;
}

/**
 * Refresh one user's Discord identity into the DB.
 *
 * Throws only on DB read/write failure. Discord API failures are swallowed
 * (logged) so a page load never breaks because Discord was unreachable.
 */
export async function refreshUser(
	userId: string,
	botToken: string,
	options: UserRefreshOptions = {}
): Promise<UserRefreshResult> {
	const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS;
	const triggeredBy = options.triggeredBy ?? "unknown";
	const logPrefix = `[user-refresh/${triggeredBy}]`;

	const result: UserRefreshResult = { userId, updated: false, skipped: false, changes: [] };

	// Step 1: load the row + its sync guard fields.
	const rows = (await withDb((db) =>
		db
			.select({
				id: Users.id,
				username: Users.username,
				globalname: Users.globalname,
				discriminator: Users.discriminator,
				avatar: Users.avatar,
				banner: Users.banner,
				accent_color: Users.accent_color,
				synced_at: Users.synced_at
			})
			.from(Users)
			.where(eq(Users.id, userId))
			.limit(1)
	)) as any[];

	if (!rows || rows.length === 0) {
		// Nothing to do - caller already handles "user not found".
		return result;
	}
	const dbUser = rows[0];

	// Step 2: staleness guard - skip if synced recently.
	if (minAgeMs > 0 && dbUser.synced_at) {
		const age = Date.now() - new Date(dbUser.synced_at).getTime();
		if (age < minAgeMs) {
			result.skipped = true;
			return result;
		}
	}

	// Step 3: fetch from Discord (non-fatal).
	let discord: DiscordUser | null = null;
	try {
		discord = await fetchDiscordUser(userId, botToken);
	} catch (err) {
		console.warn(`${logPrefix} Discord fetch failed for ${userId} (non-fatal):`, err);
		return result;
	}

	// Step 4: diff the Discord-authoritative identity fields.
	const updates: Partial<{
		username: string;
		globalname: string | null;
		discriminator: string;
		avatar: string;
		banner: string | null;
		accent_color: string | null;
		synced_at: string;
	}> = {};

	if (discord.username && discord.username !== dbUser.username) {
		updates.username = discord.username;
		result.changes.push("username");
	}
	const newGlobal = discord.global_name ?? null;
	if (newGlobal !== (dbUser.globalname ?? null)) {
		updates.globalname = newGlobal;
		result.changes.push("globalname");
	}
	const newDisc = discord.discriminator ?? "0";
	if (newDisc !== dbUser.discriminator) {
		updates.discriminator = newDisc;
		result.changes.push("discriminator");
	}
	// Normalize null avatar to "0" (default-avatar sentinel), same as bot-refresh.
	const newAvatar = discord.avatar ?? "0";
	if (newAvatar !== dbUser.avatar) {
		updates.avatar = newAvatar;
		result.changes.push("avatar");
	}

	// accent_color IS visible to a bot token, so sync it (stored as text). It backs
	// the colored header fallback on profiles with no banner image.
	const newAccent = discord.accent_color != null ? String(discord.accent_color) : null;
	if (newAccent !== (dbUser.accent_color ?? null)) {
		updates.accent_color = newAccent;
		result.changes.push("accent_color");
	}

	// Sync the Discord banner (a bot token DOES return the global user banner hash
	// for users who have one) - but never clobber a custom banner URL the user set
	// in their dashboard (a custom banner is a full http(s) URL; a Discord banner
	// is a bare hash).
	const storedBanner: string | null = dbUser.banner ?? null;
	const userHasCustomBanner = typeof storedBanner === "string" && /^https?:\/\//.test(storedBanner);
	if (!userHasCustomBanner) {
		const newBanner = discord.banner ?? null;
		if (newBanner !== storedBanner) {
			updates.banner = newBanner;
			result.changes.push("banner");
		}
	}

	// Step 5: always stamp synced_at so the guard works even on a no-op.
	updates.synced_at = new Date().toISOString();

	try {
		await withDb((db) => db.update(Users).set(updates).where(eq(Users.id, userId)));
	} catch (err) {
		console.error(`${logPrefix} DB update failed for ${userId}:`, err);
		throw err;
	}

	result.updated = result.changes.length > 0;
	if (result.updated) {
		console.debug(`${logPrefix} id=${userId} updated: ${result.changes.join(", ")}`);
	}
	return result;
}
