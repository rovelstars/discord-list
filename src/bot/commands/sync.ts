import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";

/**
 * /sync - Force-sync all custom emojis AND stickers from the current server
 * into the listing.
 *
 * Requirements:
 *  1. Must be run inside a server (no DMs).
 *  2. Invoking member must have "Manage Guild" (0x20) or "Administrator" (0x8).
 *  3. The server must already be registered on the listing site.
 *
 * Response strategy:
 *  - Synchronous pre-flight checks return an immediate ephemeral reply.
 *  - Actual sync work is deferred (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE) so
 *    Discord never times out while we hit the internal API.
 *  - Both emoji and sticker syncs run in parallel via Promise.allSettled so a
 *    sticker failure never blocks emoji results (and vice-versa).
 */

const DISCORD_API = "https://discord.com/api/v10";
const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);
const FETCH_TIMEOUT_MS = 15_000;

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

async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

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

/**
 * Call one of the internal sync endpoints.
 *
 * Returns the parsed JSON body on success, or an object with `_fetchError` set
 * if the request itself threw (timeout, network error, etc.).
 */
async function callSyncEndpoint(
	domain: string,
	path: string,
	internalSecret: string,
	guildId: string
): Promise<{ ok: boolean; status: number; body: any; _fetchError?: string }> {
	try {
		const res = await fetchWithTimeout(`${domain}${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-internal-secret": internalSecret
			},
			body: JSON.stringify({ guildId })
		});

		const body = await res.json().catch(() => null);
		return { ok: res.ok, status: res.status, body };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, status: 0, body: null, _fetchError: msg };
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
		const internalSecret: string = env?.INTERNAL_SECRET ?? "";

		if (!internalSecret) {
			console.error("[sync] INTERNAL_SECRET is not configured.");
			return reply(
				"⚙️ The bot is not configured correctly (missing internal secret). Please contact the server admin."
			);
		}

		// ── All synchronous checks passed - defer and do the rest async ────────
		(async () => {
			try {
				// ── 4. Run emoji + sticker syncs in parallel ───────────────────
				const [emojiSettled, stickerSettled] = await Promise.allSettled([
					callSyncEndpoint(domain, "/api/internals/sync-emojis", internalSecret, guildId),
					callSyncEndpoint(domain, "/api/internals/sync-stickers", internalSecret, guildId)
				]);

				// Unwrap settled results - a rejection here would be a programming
				// error since callSyncEndpoint never throws (it catches internally).
				const emojiRes = emojiSettled.status === "fulfilled" ? emojiSettled.value : null;
				const stickerRes = stickerSettled.status === "fulfilled" ? stickerSettled.value : null;

				// ── 5. Handle hard fetch failures (timeout / network error) ────
				// If emojis failed with a fetch error we can't continue meaningfully
				// because a 404 on either is our "not registered" signal.
				const emojiFetchErr = emojiRes?._fetchError;
				const stickerFetchErr = stickerRes?._fetchError;

				if (emojiFetchErr && stickerFetchErr) {
					const isTimeout = emojiFetchErr.includes("abort") || emojiFetchErr.includes("timed out");
					console.error("[sync] Both sync requests failed:", emojiFetchErr, stickerFetchErr);
					await editFollowup(
						appId,
						interactionToken,
						isTimeout
							? "⏱️ Both sync requests timed out. Please try again in a moment."
							: `⚠️ Could not reach the listing service: \`${emojiFetchErr}\`. Please try again later.`
					);
					return;
				}

				// ── 6. Check for "server not registered" (404 on either) ──────
				// A 404 from either endpoint means the server isn't in the listing
				// at all - both checks would return 404 simultaneously, so testing
				// either is sufficient.
				const notRegistered =
					(emojiRes && !emojiRes._fetchError && emojiRes.status === 404) ||
					(stickerRes && !stickerRes._fetchError && stickerRes.status === 404);

				if (notRegistered) {
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

				// ── 7. Extract per-type results ────────────────────────────────
				// A fetch error for stickers alone is non-fatal - we still report
				// emoji results and note the sticker issue separately.
				const emojiOk = emojiRes?.ok ?? false;
				const stickerOk = stickerRes?.ok ?? false;

				const emojiCreated: number = emojiRes?.body?.created ?? 0;
				const emojiUpdated: number = emojiRes?.body?.updated ?? 0;
				const emojiTotal: number = emojiRes?.body?.total ?? 0;

				const stickerCreated: number = stickerRes?.body?.created ?? 0;
				const stickerUpdated: number = stickerRes?.body?.updated ?? 0;
				const stickerTotal: number = stickerRes?.body?.total ?? 0;

				// ── 8. Build the response message ──────────────────────────────
				const guildName = interaction.guild?.name ?? guildId;
				const lines: string[] = [];

				// Overall status line
				if (emojiOk && stickerOk) {
					lines.push(`✅ Sync complete for **${guildName}**!`);
				} else if (emojiOk && !stickerOk) {
					lines.push(
						`⚠️ Partial sync complete for **${guildName}** - emojis synced, stickers failed.`
					);
				} else if (!emojiOk && stickerOk) {
					lines.push(
						`⚠️ Partial sync complete for **${guildName}** - stickers synced, emojis failed.`
					);
				} else {
					// Both failed but we already handled the 404/fetch-error cases above,
					// so this is a genuine server-side error on both.
					const emojiErr =
						emojiRes?.body?.error ?? emojiRes?.body?.message ?? `HTTP ${emojiRes?.status ?? "?"}`;
					const stickerErr =
						stickerRes?.body?.error ??
						stickerRes?.body?.message ??
						`HTTP ${stickerRes?.status ?? "?"}`;
					console.error(
						`[sync] Both syncs failed for guild ${guildId}: emoji=${emojiErr} sticker=${stickerErr}`
					);
					await editFollowup(
						appId,
						interactionToken,
						`❌ Sync failed for both emojis (${emojiErr}) and stickers (${stickerErr}). Please try again or contact the bot developer.`
					);
					return;
				}

				lines.push("");

				// Emoji results
				if (emojiOk) {
					if (emojiTotal === 0) {
						lines.push("😶 **Emojis:** No custom emojis found in this server.");
					} else {
						lines.push(
							`😄 **Emojis:** ${emojiTotal} total - 🆕 ${emojiCreated} new, 🔄 ${emojiUpdated} updated`
						);
					}
				} else {
					const errMsg = emojiRes?._fetchError
						? `fetch error: ${emojiRes._fetchError}`
						: (emojiRes?.body?.error ?? `HTTP ${emojiRes?.status ?? "?"}`);
					lines.push(`😶 **Emojis:** Sync failed (${errMsg})`);
				}

				// Sticker results
				if (stickerOk) {
					if (stickerTotal === 0) {
						lines.push("🪄 **Stickers:** No custom stickers found in this server.");
					} else {
						lines.push(
							`🪄 **Stickers:** ${stickerTotal} total - 🆕 ${stickerCreated} new, 🔄 ${stickerUpdated} updated`
						);
					}
				} else {
					const errMsg = stickerRes?._fetchError
						? `fetch error: ${stickerRes._fetchError}`
						: (stickerRes?.body?.error ?? `HTTP ${stickerRes?.status ?? "?"}`);
					lines.push(`🪄 **Stickers:** Sync failed (${errMsg})`);
				}

				// Browse links - only add for types that actually have content
				const browseLines: string[] = [];
				if (emojiOk && emojiTotal > 0) {
					browseLines.push(`😄 Emojis: ${domain}/emojis?guild=${encodeURIComponent(guildId)}`);
				}
				if (stickerOk && stickerTotal > 0) {
					browseLines.push(`🪄 Stickers: ${domain}/stickers?guild=${encodeURIComponent(guildId)}`);
				}
				if (browseLines.length > 0) {
					lines.push("", "🔗 **Browse:**");
					lines.push(...browseLines);
				}

				await editFollowup(appId, interactionToken, lines.join("\n"));
			} catch (fatalErr) {
				const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
				console.error("[sync] Fatal unhandled error in background task:", fatalErr);
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
