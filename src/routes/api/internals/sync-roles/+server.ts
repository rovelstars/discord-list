/**
 * GET /api/internals/sync-roles
 *
 * Internal endpoint that iterates every user in the DB and assigns the correct
 * Discord guild roles to those who are members of the configured guild.
 *
 * Role assignment rules:
 *   - DISCORD_USER_ROLE   → every user who has an account on the website AND
 *                           is currently in the guild.
 *   - DISCORD_BOTDEV_ROLE → every user who owns at least one bot listed on the
 *                           website AND is currently in the guild.
 *
 * Security - identical to /api/internals/refresh-cdn-bgs:
 *   1. Header:      X-Internal-Secret: <INTERNAL_SECRET>
 *   2. Query param: ?secret=<INTERNAL_SECRET>
 *
 * Concurrency / rate-limit strategy:
 *   - Users are processed in small concurrent batches (BATCH_SIZE) so we do
 *     not open hundreds of simultaneous connections to Discord.
 *   - A short delay is inserted between batches to stay comfortably below
 *     Discord's REST rate limits (50 req/s global bucket for bots).
 *   - 404 from GET /guilds/{g}/members/{u} simply means the user is not in
 *     the server - skipped silently, not counted as an error.
 *   - All other per-user errors are collected as non-fatal warnings and
 *     included in the summary response; they never abort the run.
 *
 * Response JSON (200):
 *   {
 *     success: true,
 *     durationMs: number,
 *     totalUsers: number,       // rows read from DB
 *     inGuild: number,          // users confirmed to be in the guild
 *     userRoleAssigned: number, // successful DISCORD_USER_ROLE PUTs
 *     botdevRoleAssigned: number, // successful DISCORD_BOTDEV_ROLE PUTs
 *     skippedNotInGuild: number,
 *     errors: string[]          // non-fatal per-user error messages
 *   }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { Routes } from "discord-api-types/v10";
import RestClient from "@/bot/util";
import { withDb } from "$lib/db";
import { Users, Bots } from "$lib/db/schema";
import type { DrizzleDb } from "$lib/db";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** How many users to process concurrently per batch. */
const BATCH_SIZE = 5;

/** Milliseconds to wait between batches to avoid hitting Discord rate limits. */
const BATCH_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncResult {
	totalUsers: number;
	inGuild: number;
	userRoleAssigned: number;
	botdevRoleAssigned: number;
	skippedNotInGuild: number;
	errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check whether `userId` is currently a member of `guildId`.
 *
 * Returns `true`  → member confirmed.
 * Returns `false` → 404 (not in guild) or any other non-2xx response.
 * Throws           → unexpected network / parse error (caller handles it).
 */
async function isGuildMember(
	rest: ReturnType<typeof RestClient>,
	guildId: string,
	userId: string
): Promise<boolean> {
	try {
		await rest.get(Routes.guildMember(guildId, userId));
		return true;
	} catch (err: any) {
		// @discordjs/rest surfaces HTTP errors with a `.status` property.
		const status = err?.status ?? err?.rawError?.code;
		if (status === 404) return false;
		// Re-throw anything that isn't a clean "not a member" response so the
		// caller can record it as a non-fatal error.
		throw err;
	}
}

/**
 * Assign a single role to a guild member.
 *
 * Returns `true` on success (204), `false` if the PUT itself fails.
 * Errors are surfaced to the caller via the thrown value - never swallowed
 * here so the caller can decide whether to count them.
 */
async function putGuildMemberRole(
	rest: ReturnType<typeof RestClient>,
	guildId: string,
	userId: string,
	roleId: string
): Promise<void> {
	await rest.put(Routes.guildMemberRole(guildId, userId, roleId));
}

/**
 * Fetch every user id stored in the DB.
 * Only `id` is selected - keeps the read cheap regardless of user count.
 */
async function fetchAllUserIds(): Promise<string[]> {
	const rows = (await withDb((db: DrizzleDb) => db.select({ id: Users.id }).from(Users))) as {
		id: string;
	}[];
	return rows.map((r) => String(r.id));
}

/**
 * Build a Set of user ids that own at least one bot in the Bots table.
 *
 * The `owners` column is stored as a JSON-serialised text array, so we
 * query all bot rows and parse the owners field in memory - this avoids
 * complex SQL and stays correct regardless of JSON formatting.
 *
 * For very large datasets a normalised junction table would be preferable,
 * but for typical bot-list scale this is fast enough (single SELECT, no joins).
 */
async function fetchBotOwnerIds(): Promise<Set<string>> {
	const rows = (await withDb((db: DrizzleDb) => db.select({ owners: Bots.owners }).from(Bots))) as {
		owners: string | null;
	}[];

	const ownerSet = new Set<string>();
	for (const row of rows) {
		if (!row.owners) continue;
		try {
			const parsed = JSON.parse(row.owners);
			if (Array.isArray(parsed)) {
				for (const id of parsed) {
					if (typeof id === "string" && id) ownerSet.add(id);
				}
			}
		} catch {
			// Malformed JSON in owners column - skip this row.
		}
	}
	return ownerSet;
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

async function runRoleSync(
	discordToken: string,
	guildId: string,
	userRoleId: string,
	botdevRoleId: string
): Promise<SyncResult> {
	const result: SyncResult = {
		totalUsers: 0,
		inGuild: 0,
		userRoleAssigned: 0,
		botdevRoleAssigned: 0,
		skippedNotInGuild: 0,
		errors: []
	};

	const rest = RestClient({ DISCORD_TOKEN: discordToken });

	// ------------------------------------------------------------------
	// Step 1: Load all data we need from the DB up-front (two cheap SELECTs).
	// ------------------------------------------------------------------
	const [userIds, botOwners] = await Promise.all([fetchAllUserIds(), fetchBotOwnerIds()]);

	result.totalUsers = userIds.length;

	if (userIds.length === 0) {
		return result;
	}

	// ------------------------------------------------------------------
	// Step 2: Process users in batches.
	// ------------------------------------------------------------------
	for (let offset = 0; offset < userIds.length; offset += BATCH_SIZE) {
		const batch = userIds.slice(offset, offset + BATCH_SIZE);

		await Promise.all(
			batch.map(async (userId) => {
				try {
					// ---- 2a: Check guild membership ----
					const inGuild = await isGuildMember(rest, guildId, userId);

					if (!inGuild) {
						result.skippedNotInGuild++;
						return;
					}

					result.inGuild++;

					// ---- 2b: Assign user role (every website member in the guild) ----
					if (userRoleId) {
						try {
							await putGuildMemberRole(rest, guildId, userId, userRoleId);
							result.userRoleAssigned++;
						} catch (err: any) {
							const status = err?.status ?? "?";
							result.errors.push(
								`user-role for ${userId}: HTTP ${status} - ${err instanceof Error ? err.message : String(err)}`
							);
						}
					}

					// ---- 2c: Assign botdev role (only bot owners) ----
					if (botdevRoleId && botOwners.has(userId)) {
						try {
							await putGuildMemberRole(rest, guildId, userId, botdevRoleId);
							result.botdevRoleAssigned++;
						} catch (err: any) {
							const status = err?.status ?? "?";
							result.errors.push(
								`botdev-role for ${userId}: HTTP ${status} - ${err instanceof Error ? err.message : String(err)}`
							);
						}
					}
				} catch (err: any) {
					// Unexpected error during membership check or role assignment.
					const status = err?.status ?? "?";
					result.errors.push(
						`user ${userId}: HTTP ${status} - ${err instanceof Error ? err.message : String(err)}`
					);
				}
			})
		);

		// Throttle between batches - skip the delay after the last batch.
		const isLastBatch = offset + BATCH_SIZE >= userIds.length;
		if (!isLastBatch) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const GET: RequestHandler = async ({ request, url }) => {
	// ------------------------------------------------------------------
	// Auth (mirrors /api/internals/refresh-cdn-bgs)
	// ------------------------------------------------------------------
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();

	if (!internalSecret) {
		console.error("[sync-roles] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	const suppliedSecret = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	if (!suppliedSecret || suppliedSecret !== internalSecret) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	// ------------------------------------------------------------------
	// Required env vars
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[sync-roles] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	const guildId = (env.DISCORD_GUILD_ID ?? "").trim();
	if (!guildId) {
		console.error("[sync-roles] DISCORD_GUILD_ID env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_GUILD_ID not set." },
			{ status: 500 }
		);
	}

	// Roles are optional - if not set, that role simply won't be assigned and
	// the sync still runs for whichever role IS configured.
	const userRoleId = (env.DISCORD_USER_ROLE ?? "").trim();
	const botdevRoleId = (env.DISCORD_BOTDEV_ROLE ?? "").trim();

	if (!userRoleId && !botdevRoleId) {
		return json(
			{
				success: false,
				error: "Server misconfiguration: neither DISCORD_USER_ROLE nor DISCORD_BOTDEV_ROLE is set."
			},
			{ status: 500 }
		);
	}

	// ------------------------------------------------------------------
	// Run
	// ------------------------------------------------------------------
	const startedAt = Date.now();
	console.log("[sync-roles] Starting role sync…");

	try {
		const result = await runRoleSync(discordToken, guildId, userRoleId, botdevRoleId);
		const durationMs = Date.now() - startedAt;

		console.log(
			`[sync-roles] Done in ${durationMs}ms. ` +
				`total=${result.totalUsers} ` +
				`inGuild=${result.inGuild} ` +
				`skipped=${result.skippedNotInGuild} ` +
				`userRole=${result.userRoleAssigned} ` +
				`botdevRole=${result.botdevRoleAssigned} ` +
				`errors=${result.errors.length}`
		);

		if (result.errors.length > 0) {
			console.warn("[sync-roles] Non-fatal errors:", result.errors);
		}

		return json({ success: true, durationMs, ...result }, { status: 200 });
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const message = err instanceof Error ? err.message : String(err);
		console.error("[sync-roles] Unexpected error after", durationMs, "ms:", err);
		return json({ success: false, error: message, durationMs }, { status: 500 });
	}
};
