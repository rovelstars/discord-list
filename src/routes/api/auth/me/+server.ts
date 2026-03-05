import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { withDb, type DrizzleDb } from "$lib/db";
import { Users } from "$lib/schema";
import { eq, like } from "drizzle-orm";

/**
 * GET /api/auth/me
 *
 * Lightweight endpoint that resolves the current user from the `key` cookie.
 * Returns the same shape that the old +layout.server.ts used to return as
 * `data.user`, so the client-side auth store can consume it directly.
 *
 * Response on success (200):
 *   { id, username, tag, discriminator, avatar, bal }
 *
 * Response when not logged in or token invalid (200):
 *   null
 *
 * This endpoint is called once by the client-side auth store on first load.
 * It intentionally returns 200 even for "not logged in" so the client doesn't
 * need to distinguish between "no cookie" and "invalid cookie" — both mean
 * the user is not authenticated.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const key = cookies.get("key");

	if (!key) {
		return json(null, {
			status: 200,
			headers: { "Cache-Control": "private, no-store" }
		});
	}

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});

	let userData: any = null;

	// --- Primary: try the key directly ---
	try {
		userData = await oauth.getUser(key);
	} catch {
		// Token may have expired — attempt refresh using stored keys
		try {
			const result = await withDb((db: DrizzleDb) =>
				db
					.select({ keys: Users.keys })
					.from(Users)
					.where(like(Users.keys, `%${key}%`))
					.limit(1)
			);

			if (!result || result.length === 0) {
				cookies.delete("key", { path: "/" });
				return json(null, {
					status: 200,
					headers: { "Cache-Control": "private, no-store" }
				});
			}

			// Normalize keys array (stored as JSON TEXT)
			let keys: any[] = [];
			try {
				const raw = (result[0] as any).keys;
				if (typeof raw === "string") keys = JSON.parse(raw);
				else if (Array.isArray(raw)) keys = raw;
			} catch {
				keys = [];
			}

			// Drop expired keys
			keys = keys.filter((k: any) => k && Number(k.expireTimestamp) > Date.now());

			if (keys.length === 0) {
				cookies.delete("key", { path: "/" });
				return json(null, {
					status: 200,
					headers: { "Cache-Control": "private, no-store" }
				});
			}

			// Try to refresh using the first live key's refresh token
			const keyData = keys[0];
			try {
				const tokenData: any = await oauth.tokenRequest({
					grantType: "refresh_token",
					refreshToken: keyData.refresh_token,
					scope: keyData.scope ?? "identify"
				});

				tokenData.expireTimestamp =
					Date.now() + (Number(tokenData.expires_in) || 0) * 1000 - 10_000;

				// Persist new token
				cookies.set("key", tokenData.access_token, {
					path: "/",
					maxAge: Number(tokenData.expires_in) || 3600
				});

				// Update stored keys in DB (best-effort)
				try {
					userData = await oauth.getUser(tokenData.access_token);
					const newKeys = [
						...keys.filter((k: any) => k.refresh_token !== keyData.refresh_token),
						tokenData
					];
					await withDb((db2: DrizzleDb) =>
						db2
							.update(Users)
							.set({ keys: JSON.stringify(newKeys) })
							.where(eq(Users.id, userData.id))
					);
				} catch {
					// non-fatal
				}
			} catch {
				// Refresh also failed — clear cookie
				cookies.delete("key", { path: "/" });
				return json(null, {
					status: 200,
					headers: { "Cache-Control": "private, no-store" }
				});
			}
		} catch {
			cookies.delete("key", { path: "/" });
			return json(null, {
				status: 200,
				headers: { "Cache-Control": "private, no-store" }
			});
		}
	}

	if (!userData) {
		return json(null, {
			status: 200,
			headers: { "Cache-Control": "private, no-store" }
		});
	}

	// --- Fetch bal from DB ---
	let bal: number = 0;
	try {
		const rows = await withDb((db: DrizzleDb) =>
			db.select({ bal: Users.bal }).from(Users).where(eq(Users.id, userData.id)).limit(1)
		);
		if (rows && rows.length > 0) bal = (rows[0] as any).bal ?? 0;
	} catch {
		// non-fatal — just return without bal
	}

	return json(
		{
			id: userData.id as string,
			username: (userData.global_name ?? userData.username) as string,
			tag: userData.username as string,
			discriminator: (userData.discriminator ?? "0") as string,
			avatar: (userData.avatar ?? null) as string | null,
			bal
		},
		{
			status: 200,
			headers: { "Cache-Control": "private, no-store" }
		}
	);
};
