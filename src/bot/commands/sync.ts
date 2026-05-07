import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";
import { eq } from "drizzle-orm";
import { withDb, type DrizzleDb } from "$lib/db";
import { Servers } from "$lib/db/schema";
import { syncServerEmojis, type SyncResult } from "$lib/emoji-sync";
import { syncServerStickers } from "$lib/sticker-sync";
import { reportError } from "$lib/error-reporter";

/**
 * /sync - Force-sync all custom emojis AND stickers from the current server
 * into the listing.
 *
 * Talks to the database in-process (no HTTP roundtrip) - the bot runs in the
 * same SvelteKit server as the listing app, so going out over the network
 * just to come back to ourselves is wasteful and trips Cloudflare's bot
 * challenge in front of the public origin.
 *
 * Requirements:
 *  1. Must be run inside a server (no DMs).
 *  2. Invoking member must have "Manage Guild" (0x20) or "Administrator" (0x8).
 *  3. The server must already be registered on the listing site.
 */

const DISCORD_API = "https://discord.com/api/v10";
const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);

function hasRequiredPermission(permissionsString: string | null | undefined): boolean {
	if (!permissionsString) return false;
	try {
		const perms = BigInt(permissionsString);
		return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
	} catch {
		return false;
	}
}

function reply(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 }
	};
}

const DEFERRED_EPHEMERAL = {
	type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
	data: { flags: 64 }
};

async function editFollowup(
	appId: string,
	interactionToken: string,
	content: string
): Promise<void> {
	const url = `${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`;
	const res = await fetch(url, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "discord-list/sync-command"
		},
		body: JSON.stringify({ content })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => `HTTP ${res.status}`);
		console.error("[sync] editFollowup failed:", res.status, text);
	}
}

/** Outcome of a single (emoji or sticker) sync run. */
type SyncOutcome = {
	/** True if the sync completed without error. */
	ok: boolean;
	/** True if the server isn't in the Servers table at all. */
	notRegistered: boolean;
	/** The full sync result, when one was produced (counts come from here). */
	result: SyncResult | null;
	/** A short error code when ok is false, e.g. "db_error" / "discord_fetch_failed". */
	errorCode: string | null;
};

/**
 * Run an emoji or sticker sync directly against the DB - no HTTP hop.
 *
 * Mirrors the response semantics of the old /api/internals/sync-{emojis,stickers}
 * endpoints: returns `notRegistered` when the guild isn't in our Servers table,
 * surfaces the helper's own `result.error` when Discord/DB sync fails.
 */
async function runSync(
	kind: "emojis" | "stickers",
	guildId: string,
	botToken: string
): Promise<SyncOutcome> {
	// 1. Verify the server is registered.
	try {
		const existing = await withDb((db: DrizzleDb) =>
			db.select({ id: Servers.id }).from(Servers).where(eq(Servers.id, guildId)).limit(1)
		);
		if (!Array.isArray(existing) || existing.length === 0) {
			return { ok: true, notRegistered: true, result: null, errorCode: null };
		}
	} catch (err) {
		await reportError(`[sync:${kind}] DB server-check error for guild ${guildId}`, err);
		return { ok: false, notRegistered: false, result: null, errorCode: "db_error" };
	}

	if (!botToken) {
		return { ok: false, notRegistered: false, result: null, errorCode: "bot_token_missing" };
	}

	// 2. Run the sync helper (these never throw under normal operation, but
	// guard anyway so a bad migration / unexpected condition can't take the
	// command down.)
	try {
		const result =
			kind === "emojis"
				? await syncServerEmojis(guildId, botToken)
				: await syncServerStickers(guildId, botToken);

		if (result.error) {
			return {
				ok: false,
				notRegistered: false,
				result,
				errorCode: result.error
			};
		}
		return { ok: true, notRegistered: false, result, errorCode: null };
	} catch (err) {
		await reportError(`[sync:${kind}] Unexpected throw syncing guild ${guildId}`, err);
		return { ok: false, notRegistered: false, result: null, errorCode: "sync_threw" };
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName("sync")
		.setDescription(
			"Force-sync this server's custom emojis and stickers into the Rovel Discord List."
		)
		.setDMPermission(false),

	run(interaction: Record<string, any>, env?: Record<string, any>) {
		// ── 1. Guild-only guard ────────────────────────────────────────────────
		const guildId: string | undefined = interaction.guild_id;
		if (!guildId) {
			return reply("❌ This command can only be used inside a server.");
		}

		// ── 2. Permission check ────────────────────────────────────────────────
		const memberPermissions: string | null | undefined = interaction.member?.permissions;
		if (!hasRequiredPermission(memberPermissions)) {
			return reply("❌ You need the **Manage Server** or **Administrator** permission to sync.");
		}

		// ── 3. Resolve env values ──────────────────────────────────────────────
		const appId: string = env?.DISCORD_BOT_ID ?? "";
		const interactionToken: string = interaction.token;
		const domain: string = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
		const botToken: string = env?.DISCORD_TOKEN ?? "";

		if (!botToken) {
			console.error("[sync] DISCORD_TOKEN is not configured.");
			return reply(
				"⚙️ The bot is not configured correctly (missing bot token). Please contact the server admin."
			);
		}

		// ── All synchronous checks passed - defer and do the rest async ────────
		(async () => {
			try {
				// ── 4. Run emoji + sticker syncs in parallel ───────────────────
				const [emojiRes, stickerRes] = await Promise.all([
					runSync("emojis", guildId, botToken),
					runSync("stickers", guildId, botToken)
				]);

				// ── 5. "Server not registered" short-circuit ──────────────────
				// Both syncs hit the same Servers row, so they return notRegistered
				// in lockstep - testing either is sufficient.
				if (emojiRes.notRegistered || stickerRes.notRegistered) {
					await editFollowup(
						appId,
						interactionToken,
						[
							"❌ This server is not yet registered on **Rovel Discord List**.",
							"",
							"Run `/register` first to add your server to the listing, then use `/sync` to update its emojis and stickers."
						].join("\n")
					);
					return;
				}

				// ── 6. Both fully failed (e.g. DB down) ───────────────────────
				if (!emojiRes.ok && !stickerRes.ok) {
					const emojiErr = emojiRes.errorCode ?? "unknown";
					const stickerErr = stickerRes.errorCode ?? "unknown";
					await editFollowup(
						appId,
						interactionToken,
						`❌ Sync failed for both emojis (${emojiErr}) and stickers (${stickerErr}). Please try again or contact the bot developer.`
					);
					return;
				}

				// ── 7. Build the response message ──────────────────────────────
				const guildName = interaction.guild?.name ?? guildId;
				const lines: string[] = [];

				if (emojiRes.ok && stickerRes.ok) {
					lines.push(`✅ Sync complete for **${guildName}**!`);
				} else if (emojiRes.ok && !stickerRes.ok) {
					lines.push(
						`⚠️ Partial sync complete for **${guildName}** - emojis synced, stickers failed.`
					);
				} else {
					lines.push(
						`⚠️ Partial sync complete for **${guildName}** - stickers synced, emojis failed.`
					);
				}

				lines.push("");

				// Emoji results
				if (emojiRes.ok) {
					const r = emojiRes.result!;
					if (r.total === 0) {
						lines.push("😶 **Emojis:** No custom emojis found in this server.");
					} else {
						lines.push(
							`😄 **Emojis:** ${r.total} total - 🆕 ${r.created} new, 🔄 ${r.updated} updated`
						);
					}
				} else {
					lines.push(`😶 **Emojis:** Sync failed (${emojiRes.errorCode ?? "unknown"})`);
				}

				// Sticker results
				if (stickerRes.ok) {
					const r = stickerRes.result!;
					if (r.total === 0) {
						lines.push("🪄 **Stickers:** No custom stickers found in this server.");
					} else {
						lines.push(
							`🪄 **Stickers:** ${r.total} total - 🆕 ${r.created} new, 🔄 ${r.updated} updated`
						);
					}
				} else {
					lines.push(`🪄 **Stickers:** Sync failed (${stickerRes.errorCode ?? "unknown"})`);
				}

				// Browse links - only add for types that actually have content
				const browseLines: string[] = [];
				if (emojiRes.ok && (emojiRes.result?.total ?? 0) > 0) {
					browseLines.push(`😄 Emojis: ${domain}/emojis?guild=${encodeURIComponent(guildId)}`);
				}
				if (stickerRes.ok && (stickerRes.result?.total ?? 0) > 0) {
					browseLines.push(`🪄 Stickers: ${domain}/stickers?guild=${encodeURIComponent(guildId)}`);
				}
				if (browseLines.length > 0) {
					lines.push("", "🔗 **Browse:**");
					lines.push(...browseLines);
				}

				await editFollowup(appId, interactionToken, lines.join("\n"));
			} catch (fatalErr) {
				const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
				await reportError("[sync] Fatal unhandled error in background task", fatalErr);
				await editFollowup(
					appId,
					interactionToken,
					`💥 An unexpected error occurred: \`${msg}\`\nPlease try again or report this to the bot developer.`
				).catch(() => {});
			}
		})();

		return DEFERRED_EPHEMERAL;
	}
};
