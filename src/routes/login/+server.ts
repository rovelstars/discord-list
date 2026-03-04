import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";

/**
 * GET /login
 *
 * Query params:
 *   servers  - "true" | "false"  (request guilds.join scope)
 *   email    - "true" | "false"  (request email scope)
 *   redirect - path to return to after auth (falls back to cookie, then "/")
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const wantServers = url.searchParams.get("servers") !== "false";
	const wantEmail = url.searchParams.get("email") !== "false";
	const redirectParam = url.searchParams.get("redirect");

	// Capture referral code from ?ref=<code> and persist it as a short-lived
	// httpOnly cookie. The OAuth2 callback (/api/auth) reads this cookie after
	// the new user's account is created and passes it to createReferral().
	// We only set it if a non-empty value is present so we never overwrite a
	// valid referral code with an empty string on a subsequent plain login.
	const refCode = url.searchParams.get("ref")?.trim();
	if (refCode) {
		cookies.set("ref", refCode, {
			path: "/",
			maxAge: 60 * 15, // 15 minutes - enough for the full OAuth round-trip
			sameSite: "lax",
			httpOnly: true
		});
	}

	// Build the scope list
	const scopes = ["identify"];
	if (wantEmail) scopes.push("email");
	if (wantServers) scopes.push("guilds.join");

	// Persist scopes so the callback (/api/auth) can use them
	cookies.set("scopes", JSON.stringify(scopes), {
		path: "/",
		maxAge: 60 * 10, // 10 minutes - just long enough for the OAuth round-trip
		sameSite: "lax",
		httpOnly: true
	});

	// Persist redirect target
	const redirectTo = redirectParam || cookies.get("redirect") || "/";
	cookies.set("redirect", redirectTo, {
		path: "/",
		maxAge: 60 * 10,
		sameSite: "lax",
		httpOnly: true
	});

	const domain = (env.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: `${domain}/api/auth`
	});

	const authUrl = oauth.generateAuthUrl({
		scope: scopes,
		responseType: "code"
	});

	throw redirect(302, authUrl);
};
