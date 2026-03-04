import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { commands, runs } from "@/bot/register";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid ephemeral Discord message response - always HTTP 200. */
function ephemeralReply(content: string) {
	return new Response(
		JSON.stringify({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: { content, flags: 64 }
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
}

/** Build a JSON response (non-interaction). */
function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

// ---------------------------------------------------------------------------
// GET - health / info
// ---------------------------------------------------------------------------

export const GET: RequestHandler = async () => {
	return new Response(`👋 ${env.DISCORD_BOT_ID ?? ""}`, { status: 200 });
};

// ---------------------------------------------------------------------------
// POST - Discord interaction webhook
// ---------------------------------------------------------------------------

/**
 * Handles every Discord interaction POST.
 *
 * Design goals:
 *  1. Always return HTTP 200 with a valid interaction response body when the
 *     interaction type is APPLICATION_COMMAND - Discord marks anything else as
 *     "application did not respond".
 *  2. Never let an unhandled exception propagate; wrap everything in a
 *     guaranteed fallback that returns an ephemeral error message to the user.
 *  3. Surface meaningful, actionable error text instead of generic warnings.
 *  4. Reserve non-200 responses only for cases where Discord itself expects
 *     them: 401 for invalid signature (before the interaction is parsed),
 *     400 for a malformed PING/unknown type.
 */
export const POST: RequestHandler = async ({ request }) => {
	// ── 1. Signature verification ────────────────────────────────────────────
	// Must happen before any other processing; Discord drops connections that
	// don't verify correctly.  A failure here is a genuine 401 - the request
	// didn't come from Discord (or the public key is misconfigured).
	let bodyBuffer: ArrayBuffer;
	let bodyText: string;

	try {
		bodyBuffer = await request.arrayBuffer();
		bodyText = new TextDecoder().decode(bodyBuffer);
	} catch (readErr) {
		console.error("[discord/bot] Failed to read request body:", readErr);
		return new Response("Bad Request", { status: 400 });
	}

	const publicKey = (env.DISCORD_PUBLIC_KEY ?? "").trim();
	if (!publicKey) {
		// Misconfiguration - we can't verify anything.  Log loudly and bail.
		console.error(
			"[discord/bot] DISCORD_PUBLIC_KEY is not set. " +
				"Set it in your environment to enable interaction verification."
		);
		return new Response("Server misconfiguration: missing public key.", { status: 500 });
	}

	const signature = request.headers.get("x-signature-ed25519") ?? "";
	const timestamp = request.headers.get("x-signature-timestamp") ?? "";

	let signatureValid = false;
	try {
		signatureValid = !!(
			signature &&
			timestamp &&
			(await verifyKey(bodyBuffer, signature, timestamp, publicKey))
		);
	} catch (verifyErr) {
		console.error("[discord/bot] verifyKey threw:", verifyErr);
		signatureValid = false;
	}

	if (!signatureValid) {
		return new Response("Invalid request signature.", { status: 401 });
	}

	// ── 2. Parse interaction payload ─────────────────────────────────────────
	let interaction: Record<string, any>;
	try {
		interaction = JSON.parse(bodyText);
		if (!interaction || typeof interaction !== "object") throw new Error("not an object");
	} catch {
		return new Response("Invalid interaction payload.", { status: 400 });
	}

	// ── 3. PING - required by Discord during endpoint registration ───────────
	if (interaction.type === InteractionType.PING) {
		return jsonResponse({ type: InteractionResponseType.PONG });
	}

	// ── 4. APPLICATION_COMMAND ───────────────────────────────────────────────
	// From this point onward we MUST return HTTP 200 with a valid response
	// body, otherwise Discord shows "application did not respond" to the user.
	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
		try {
			const incomingName = (interaction.data?.name ?? "").toString().toLowerCase().trim();

			// ── 4a. Find the command ─────────────────────────────────────────
			const cmd = commands.find(
				(c: any) => (c.name ?? "").toString().toLowerCase().trim() === incomingName
			);

			if (!cmd) {
				console.warn("[discord/bot] Unknown command received:", incomingName);
				return ephemeralReply(
					`❓ Unknown command \`/${incomingName}\`. ` +
						"This command may not be registered yet - please contact the server admin."
				);
			}

			const index = commands.indexOf(cmd);
			const run = runs[index];

			if (typeof run !== "function") {
				console.error("[discord/bot] No run handler for command:", incomingName);
				return ephemeralReply(
					`⚙️ The \`/${incomingName}\` command has no handler implemented yet. ` +
						"Please report this to the bot developer."
				);
			}

			// ── 4b. Build env payload for the handler ────────────────────────
			const envPayload = {
				MODE: env.MODE ?? "production",
				DISCORD_BOT_ID: env.DISCORD_BOT_ID ?? "",
				DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? "",
				DISCORD_TOKEN: env.DISCORD_TOKEN ?? "",
				DOMAIN: (env.DOMAIN ?? "http://localhost:5173").replace(/\/$/, ""),
				INTERNAL_SECRET: env.INTERNAL_SECRET ?? ""
			};

			// ── 4c. Run the handler ──────────────────────────────────────────
			let result: any;
			try {
				result = await run(interaction, envPayload);
			} catch (handlerErr) {
				// The handler itself threw - surface a clear message.
				const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr);
				console.error(
					`[discord/bot] Handler for "/${incomingName}" threw an exception:`,
					handlerErr
				);
				return ephemeralReply(
					`⚠️ An error occurred while running \`/${incomingName}\`:\n\`\`\`\n${msg}\n\`\`\`\n` +
						"Please try again or report this to the bot developer."
				);
			}

			// ── 4d. Validate the returned response object ────────────────────
			if (result && typeof result === "object" && "type" in result) {
				return new Response(JSON.stringify(result), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				});
			}

			// Handler returned something unusable - treat as a bug.
			console.error(
				`[discord/bot] Handler for "/${incomingName}" returned an invalid response:`,
				result
			);
			return ephemeralReply(
				`⚙️ \`/${incomingName}\` completed but returned an invalid response object. ` +
					"Please report this to the bot developer."
			);
		} catch (outerErr) {
			// Absolute last-resort catch - something went badly wrong outside the
			// handler itself (e.g. command lookup, env construction, etc.).
			const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
			console.error("[discord/bot] Unexpected error in command dispatch:", outerErr);
			return ephemeralReply(
				`💥 An unexpected error occurred while processing your command:\n\`\`\`\n${msg}\n\`\`\`\n` +
					"Please try again in a moment."
			);
		}
	}

	// ── 5. Unknown interaction type ──────────────────────────────────────────
	console.warn("[discord/bot] Received unknown interaction type:", interaction.type);
	return new Response("Unknown interaction type.", { status: 400 });
};
