import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";

// The bot command registry / handlers used by the legacy implementation.
// The module path is relative to this file and mirrors the project layout.
import { commands, runs } from "@/bot/register";

/**
 * GET /api/discord/bot
 * Simple health-ish endpoint that returns the configured bot id (if present).
 */
export const GET: RequestHandler = async () => {
	return new Response(`👋 ${env.DISCORD_BOT_ID ?? ""}`, { status: 200 });
};

/**
 * POST /api/discord/bot
 *
 * Discord Interaction endpoint.
 * - Verifies the request using Discord's Ed25519 signature headers.
 * - Responds to PING with PONG as required by Discord.
 * - Dispatches application commands to the registered handlers.
 *
 * Security:
 * - Requires DISCORD_PUBLIC_KEY to be set in server env.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const publicKey = env.DISCORD_PUBLIC_KEY;
		if (!publicKey) {
			console.error("DISCORD_PUBLIC_KEY not configured for interactions.");
			return new Response("No public key found in env", { status: 500 });
		}

		// Read raw body (ArrayBuffer) for signature verification
		const bodyBuffer = await request.arrayBuffer();

		const signature = request.headers.get("x-signature-ed25519") ?? "";
		const timestamp = request.headers.get("x-signature-timestamp") ?? "";

		const valid =
			signature && timestamp && (await verifyKey(bodyBuffer, signature, timestamp, publicKey));

		if (!valid) {
			console.warn("Invalid interaction signature");
			return new Response("Invalid Request Signature", { status: 401 });
		}

		// Safe to parse JSON now that signature passed
		const interaction = await request.json();

		if (!interaction || typeof interaction !== "object") {
			return new Response("Invalid interaction payload", { status: 400 });
		}

		// Handle PING from Discord
		if (interaction.type === InteractionType.PING) {
			return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			});
		}

		// Handle application command interactions
		if (interaction.type === InteractionType.APPLICATION_COMMAND) {
			try {
				const incomingName = (interaction.data?.name ?? "").toString().toLowerCase();
				const cmd = commands.find(
					(c: any) => (c.name ?? "").toString().toLowerCase() === incomingName
				);

				if (!cmd) {
					console.warn("Unknown command received:", incomingName);
					return new Response(JSON.stringify({ error: "Unknown Command" }), {
						status: 400,
						headers: { "Content-Type": "application/json" }
					});
				}

				// Find index and matching runner
				const index = commands.indexOf(cmd);
				const run = runs[index];

				if (typeof run !== "function") {
					console.error("No run handler for command:", incomingName);
					return new Response(JSON.stringify({ error: "Handler not implemented" }), {
						status: 500,
						headers: { "Content-Type": "application/json" }
					});
				}

				// Execute the command handler. Provide a small environment object so
				// handlers can access tokens / configuration if they need to.
				// The handler may return a response to send back to Discord; legacy
				// handlers typically perform their own reply using the Discord API,
				// but we'll accept an optional returned payload to echo.
				const envPayload = {
					MODE: env.MODE,
					DISCORD_BOT_ID: env.DISCORD_BOT_ID,
					DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
					DISCORD_TOKEN: env.DISCORD_TOKEN
				};

				const result = await run(interaction, envPayload);

				// Every handler must return a valid interaction response object.
				if (result && typeof result === "object" && "type" in result) {
					return new Response(JSON.stringify(result), {
						status: 200,
						headers: { "Content-Type": "application/json" }
					});
				}

				// Handler returned nothing usable — this is a bug in the command
				// implementation. Log it and tell Discord something went wrong so
				// the user sees a message rather than a silent timeout.
				console.error(`Command handler for "${incomingName}" did not return a response object.`);
				return new Response(
					JSON.stringify({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "⚠️ This command didn't return a response. Please report this.",
							flags: 64
						}
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" }
					}
				);
			} catch (handlerErr) {
				console.error("Error running command handler:", handlerErr);
				// Must still return 200 with a valid interaction response so Discord
				// doesn't retry and the user sees the error instead of a timeout.
				return new Response(
					JSON.stringify({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: { content: "⚠️ An error occurred while running this command.", flags: 64 }
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" }
					}
				);
			}
		}

		// Unknown interaction type
		return new Response("Unknown Interaction Type", { status: 400 });
	} catch (err) {
		console.error("Interaction endpoint error:", err);
		return new Response("Invalid Request Signature", { status: 401 });
	}
};
