import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { withDb, type DrizzleDb } from "$lib/db";
import { Servers } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { syncServerEmojis } from "$lib/emoji-sync";
import { syncServerStickers } from "$lib/sticker-sync";
import { awardSelfListing, awardServerBounty } from "$lib/db/queries/referrals";
import type { DoubleCreditResult } from "$lib/db/queries/referrals";
import { Referrals } from "$lib/db/schema";

function validateSecret(request: Request): boolean {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) return false;
	const supplied = (request.headers.get("x-internal-secret") ?? "").trim();
	return supplied === internalSecret;
}

/**
 * POST /api/internals/register-server
 *
 * Upserts a Discord server into the Servers table. Called by the /register
 * slash command after it has verified the user's permissions and confirmed
 * they have a site account.
 *
 * After a successful upsert, kicks off a background emoji sync so the
 * server's custom emojis are immediately available in the listing.
 *
 * Auth: x-internal-secret header must match INTERNAL_SECRET env var.
 *
 * Body (JSON):
 *   { id: string, name: string, icon: string | null, owner: string }
 *
 * Response:
 *   200 { success: true, created: boolean }
 *   400 { error: string }
 *   401 { error: "Unauthorized" }
 *   500 { error: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!validateSecret(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { id?: string; name?: string; icon?: string | null; owner?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid_json" }, { status: 400 });
	}

	const { id, name, icon, owner } = body ?? {};

	if (!id || typeof id !== "string" || !id.trim()) {
		return json({ error: "missing_id" }, { status: 400 });
	}
	if (!name || typeof name !== "string" || !name.trim()) {
		return json({ error: "missing_name" }, { status: 400 });
	}
	if (!owner || typeof owner !== "string" || !owner.trim()) {
		return json({ error: "missing_owner" }, { status: 400 });
	}

	const guildId = id.trim();

	try {
		// Check if already exists so we can report created vs updated
		const existing = await withDb((db: DrizzleDb) =>
			db.select({ id: Servers.id }).from(Servers).where(eq(Servers.id, guildId)).limit(1)
		);

		const isNew = !Array.isArray(existing) || existing.length === 0;
		const ownerId = owner.trim();
		const now = new Date().toISOString();

		if (isNew) {
			await withDb((db: DrizzleDb) =>
				db.insert(Servers).values({
					id: guildId,
					name: name.trim(),
					short: "Short description is not Updated.",
					desc: "Description is not updated.",
					icon: icon ?? "",
					owner: ownerId,
					slug: "",
					added_at: now,
					votes: 0,
					promoted: false,
					badges: JSON.stringify([])
				})
			);
		} else {
			// On re-registration only update identity fields; preserve any
			// customisation (short, desc, slug, badges, votes) the owner set
			// through the dashboard.
			await withDb((db: DrizzleDb) =>
				db
					.update(Servers)
					.set({
						name: name.trim(),
						icon: icon ?? "",
						owner: ownerId
					})
					.where(eq(Servers.id, guildId))
			);
		}

		// ── Referral rewards (new listing only) ───────────────────────────────
		// member_count is not available from the /register slash command at this
		// point (the bot hasn't fetched the full guild object yet). We schedule
		// both self-listing and server-bounty reward checks as fire-and-forget
		// tasks that read member_count from the Servers row once the background
		// server-refresh has populated it. For an immediate reward on first
		// registration we pass the member_count from the request body if the
		// caller supplies it (the bot can pass it after calling guild.fetch()).
		// If member_count is absent we defer; the refresh flow will call
		// /api/internals/check-server-rewards once it has the real count.
		if (isNew) {
			const memberCountFromBody =
				typeof (body as any).member_count === "number"
					? ((body as any).member_count as number)
					: null;

			if (memberCountFromBody !== null) {
				// ── Self-listing reward ────────────────────────────────────────
				awardSelfListing(ownerId, guildId, memberCountFromBody)
					.then((result) => {
						if (result) {
							console.info(
								`[register-server] Self-listing reward: ` +
									`R$${result.amount} (${result.milestoneType}) → ${ownerId} ` +
									`for server ${guildId} (${memberCountFromBody} members). ` +
									`New bal: R$${result.newBalance}`
							);
						}
					})
					.catch((err) => {
						console.warn(
							`[register-server] awardSelfListing failed for ${guildId} (non-fatal):`,
							err instanceof Error ? err.message : String(err)
						);
					});

				// ── Server-bounty reward (≥50 members) ────────────────────────
				// Check whether the server owner was referred by someone and the
				// server qualifies for the R$500 bounty (first listing, ≥50 members).
				if (memberCountFromBody >= 50) {
					withDb((db: DrizzleDb) =>
						db
							.select({
								id: Referrals.id,
								referrer_id: Referrals.referrer_id
							})
							.from(Referrals)
							.where(eq(Referrals.referred_id, ownerId))
							.limit(1)
					)
						.then(async (rows) => {
							if (!Array.isArray(rows) || rows.length === 0) return;
							const referral = rows[0] as { id: string; referrer_id: string };
							// Double-sided Growth Bounty: referrer + referred user each get R$500
							const result = await awardServerBounty(
								referral.id,
								referral.referrer_id,
								ownerId,
								guildId,
								memberCountFromBody
							);
							if (result !== null) {
								console.info(
									`[register-server] Growth Bounty (double-sided): ` +
										`R$500 → ${referral.referrer_id} (new bal: R$${result.referrerNewBal ?? "?"}) | ` +
										`R$500 → ${ownerId} (new bal: R$${result.referredNewBal ?? "?"}) ` +
										`(referred user ${ownerId} listed server ${guildId} ` +
										`with ${memberCountFromBody} members)`
								);
							}
						})
						.catch((err) => {
							console.warn(
								`[register-server] awardServerBounty check failed for ${guildId} (non-fatal):`,
								err instanceof Error ? err.message : String(err)
							);
						});
				}
			}
		}

		// ── Background emoji + sticker sync ───────────────────────────────────
		// Fire-and-forget: sync the guild's custom emojis and stickers
		// immediately after registration so they appear in the listing without
		// requiring a separate /sync command. Neither call blocks or fails the
		// registration response — they run independently of each other.
		const botToken = (env.DISCORD_TOKEN ?? "").trim();
		if (botToken) {
			syncServerEmojis(guildId, botToken)
				.then((result) => {
					if (result.error) {
						console.warn(
							`[register-server] Emoji sync for guild ${guildId} encountered an error: ${result.error}`
						);
					} else {
						console.info(
							`[register-server] Emoji sync complete for guild ${guildId}: ` +
								`+${result.created} new, ~${result.updated} updated (${result.total} total)`
						);
					}
				})
				.catch((err) => {
					console.warn(
						`[register-server] Background emoji sync threw unexpectedly for guild ${guildId}:`,
						err
					);
				});

			syncServerStickers(guildId, botToken)
				.then((result) => {
					if (result.error) {
						console.warn(
							`[register-server] Sticker sync for guild ${guildId} encountered an error: ${result.error}`
						);
					} else {
						console.info(
							`[register-server] Sticker sync complete for guild ${guildId}: ` +
								`+${result.created} new, ~${result.updated} updated (${result.total} total)`
						);
					}
				})
				.catch((err) => {
					console.warn(
						`[register-server] Background sticker sync threw unexpectedly for guild ${guildId}:`,
						err
					);
				});
		}

		return json(
			{
				success: true,
				created: isNew,
				// Expose whether reward checks ran so the bot can log it.
				rewardsChecked: isNew && typeof (body as any).member_count === "number"
			},
			{ status: 200 }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[register-server] DB error:", msg);
		return json({ error: "db_error" }, { status: 500 });
	}
};
