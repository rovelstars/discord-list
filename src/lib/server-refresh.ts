/**
 * server-refresh.ts
 *
 * Shared logic for refreshing a Discord guild's snapshot data and persisting
 * any changes back to the Servers table.
 *
 * Mirrors the structure of bot-refresh.ts but targets the Servers table and
 * fetches guild-level data (member counts, channel list, NSFW flag) rather
 * than bot identity data.
 *
 * Discord API calls made:
 *   GET /guilds/:id?with_counts=true  - member + presence approximations
 *   GET /guilds/:id/channels          - full channel list (type + nsfw flag)
 *
 * Both calls require the bot to be a member of the guild. If the bot has left
 * or was never in the guild, the calls return 403/404 and are treated as
 * non-fatal partial errors - the function still updates whatever it could.
 *
 * Stale-data guard:
 *   The caller can supply `minAgeMs` (default 10 minutes). If `synced_at` in
 *   the DB is more recent than that, `refreshServer` returns early with
 *   `skipped: true` so page loads don't hammer Discord on every request.
 */

import { getDb } from "$lib/db";
import { Servers } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { updateServerSnapshot } from "$lib/db/queries";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ServerRefreshResult {
	/** The guild ID that was processed. */
	serverId: string;
	/** Whether the DB was actually written. */
	updated: boolean;
	/** True when skipped because data was still fresh enough. */
	skipped: boolean;
	/** Human-readable list of what changed. */
	changes: string[];
	/** Non-fatal error message from a partial Discord failure. */
	partialError?: string;
}

export interface ServerRefreshOptions {
	/**
	 * Minimum age in milliseconds before a re-sync is allowed.
	 * Defaults to 10 minutes. Pass 0 to force a refresh.
	 */
	minAgeMs?: number;
	/** Short label used in log lines. Defaults to 'unknown'. */
	triggeredBy?: string;
}

// ---------------------------------------------------------------------------
// Discord API shapes (minimal - only the fields we care about)
// ---------------------------------------------------------------------------

interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	approximate_member_count?: number;
	approximate_presence_count?: number;
}

interface DiscordChannel {
	id: string;
	name: string;
	/** Discord channel type integer (0=text,2=voice,4=category,5=announcement,…) */
	type: number;
	/** Only present on text-like channels; undefined === false. */
	nsfw?: boolean;
}

// ---------------------------------------------------------------------------
// Discord API helpers
// ---------------------------------------------------------------------------

async function fetchGuild(guildId: string, botToken: string): Promise<DiscordGuild> {
	const res = await fetch(
		`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}?with_counts=true`,
		{
			headers: {
				Authorization: `Bot ${botToken}`,
				"User-Agent": "discord-list/infra"
			}
		}
	);

	if (!res.ok) {
		const text = await res.text().catch(() => "(unreadable)");
		throw new Error(`Discord GET /guilds/${guildId} returned HTTP ${res.status}: ${text}`);
	}

	return res.json() as Promise<DiscordGuild>;
}

async function fetchChannels(guildId: string, botToken: string): Promise<DiscordChannel[]> {
	const res = await fetch(
		`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}/channels`,
		{
			headers: {
				Authorization: `Bot ${botToken}`,
				"User-Agent": "discord-list/infra"
			}
		}
	);

	if (!res.ok) {
		const text = await res.text().catch(() => "(unreadable)");
		throw new Error(
			`Discord GET /guilds/${guildId}/channels returned HTTP ${res.status}: ${text}`
		);
	}

	return res.json() as Promise<DiscordChannel[]>;
}

// ---------------------------------------------------------------------------
// Core refresh logic
// ---------------------------------------------------------------------------

const DEFAULT_MIN_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Refresh a single guild's snapshot data from Discord and persist to DB.
 *
 * @param serverId    The guild's primary-key `id` in the Servers table.
 * @param botToken    Discord bot token (value only, without "Bot " prefix).
 * @param options     Optional knobs (stale-threshold, log label).
 *
 * @returns A `ServerRefreshResult` describing what happened.
 *          Throws only on DB read/write failures.
 *          Discord API failures are captured as `partialError` and do not throw.
 */
export async function refreshServer(
	serverId: string,
	botToken: string,
	options: ServerRefreshOptions = {}
): Promise<ServerRefreshResult> {
	const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS;
	const triggeredBy = options.triggeredBy ?? "unknown";
	const logPrefix = `[server-refresh/${triggeredBy}]`;

	const result: ServerRefreshResult = {
		serverId,
		updated: false,
		skipped: false,
		changes: []
	};

	const db = getDb();

	// -----------------------------------------------------------------------
	// Step 1: Load current server row (only the fields we need to diff/guard)
	// -----------------------------------------------------------------------
	const rows = await db
		.select({
			id: Servers.id,
			member_count: Servers.member_count,
			presence_count: Servers.presence_count,
			channels: Servers.channels,
			has_nsfw: Servers.has_nsfw,
			synced_at: Servers.synced_at
		})
		.from(Servers)
		.where(eq(Servers.id, serverId))
		.limit(1);

	if (!rows || rows.length === 0) {
		throw new NotFoundError(`Server ${serverId} not found in database.`);
	}

	const dbServer = rows[0];

	// -----------------------------------------------------------------------
	// Step 2: Stale-data guard - skip if recently synced
	// -----------------------------------------------------------------------
	if (minAgeMs > 0 && dbServer.synced_at) {
		const age = Date.now() - new Date(dbServer.synced_at).getTime();
		if (age < minAgeMs) {
			console.debug(
				`${logPrefix} id=${serverId} skipped - synced ${Math.round(age / 1000)}s ago (minAge=${minAgeMs / 1000}s)`
			);
			result.skipped = true;
			return result;
		}
	}

	// -----------------------------------------------------------------------
	// Step 3: Fetch guild data from Discord (non-fatal)
	// -----------------------------------------------------------------------
	let guild: DiscordGuild | null = null;
	try {
		guild = await fetchGuild(serverId, botToken);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`${logPrefix} Could not fetch guild ${serverId}: ${msg}`);
		result.partialError = `guild_fetch_failed: ${msg}`;
	}

	// -----------------------------------------------------------------------
	// Step 4: Fetch channel list from Discord (non-fatal)
	// -----------------------------------------------------------------------
	let rawChannels: DiscordChannel[] | null = null;
	try {
		rawChannels = await fetchChannels(serverId, botToken);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`${logPrefix} Could not fetch channels for ${serverId}: ${msg}`);
		// Append to any existing partialError
		result.partialError = result.partialError
			? `${result.partialError}; channels_fetch_failed: ${msg}`
			: `channels_fetch_failed: ${msg}`;
	}

	// If both calls failed there is nothing to write - bail early so we don't
	// thrash synced_at without actually having any data.
	if (!guild && !rawChannels) {
		console.warn(`${logPrefix} Both Discord fetches failed for ${serverId}, aborting.`);
		return result;
	}

	// -----------------------------------------------------------------------
	// Step 5: Diff and build the snapshot patch
	// -----------------------------------------------------------------------
	const snapshot: {
		member_count?: number | null;
		presence_count?: number | null;
		channels?: Array<{ id: string; name: string; type: number; nsfw: boolean }>;
		has_nsfw?: boolean;
		synced_at: string;
	} = {
		synced_at: new Date().toISOString()
	};

	if (guild) {
		const newMemberCount = guild.approximate_member_count ?? null;
		const newPresenceCount = guild.approximate_presence_count ?? null;

		if (newMemberCount !== (dbServer.member_count ?? null)) {
			snapshot.member_count = newMemberCount;
			result.changes.push(
				`member_count: ${dbServer.member_count ?? "null"} → ${newMemberCount ?? "null"}`
			);
		}

		if (newPresenceCount !== (dbServer.presence_count ?? null)) {
			snapshot.presence_count = newPresenceCount;
			result.changes.push(
				`presence_count: ${dbServer.presence_count ?? "null"} → ${newPresenceCount ?? "null"}`
			);
		}
	}

	if (rawChannels) {
		// Map to our compact shape - keep only the fields the UI needs.
		const mappedChannels = rawChannels.map((ch) => ({
			id: ch.id,
			name: ch.name ?? "",
			type: ch.type,
			nsfw: Boolean(ch.nsfw)
		}));

		const newHasNsfw = mappedChannels.some((ch) => ch.nsfw);
		const oldHasNsfw = Boolean(dbServer.has_nsfw);

		snapshot.channels = mappedChannels;
		// Always write channels (they change frequently and we can't easily diff a list)
		result.changes.push(`channels: updated (${mappedChannels.length} channels)`);

		if (newHasNsfw !== oldHasNsfw) {
			snapshot.has_nsfw = newHasNsfw;
			result.changes.push(`has_nsfw: ${oldHasNsfw} → ${newHasNsfw}`);
		} else {
			// Still include has_nsfw in the write so it stays consistent with channels
			snapshot.has_nsfw = newHasNsfw;
		}
	}

	// -----------------------------------------------------------------------
	// Step 6: Persist - always write synced_at so the stale guard works even
	//         when nothing else changed.
	// -----------------------------------------------------------------------
	await updateServerSnapshot(serverId, snapshot);
	result.updated = true;

	console.log(
		`${logPrefix} id=${serverId} updated=${result.updated}` +
			(result.changes.length ? ` changes=[${result.changes.join(", ")}]` : "")
	);

	return result;
}

// ---------------------------------------------------------------------------
// Sentinel error type
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}
