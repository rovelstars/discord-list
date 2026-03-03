import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db";
import { Users } from "$lib/schema";
import { eq } from "drizzle-orm";
// SendLog is copied into src/bot/log.ts previously
import SendLog from "@/bot/log";
import joinServer from "$lib/functions/join-server";
import { assignUserRole } from "$lib/assign-guild-role";
import { createReferral, resolveReferralCode } from "$lib/db/queries/referrals";

export const GET: RequestHandler = async (event) => {
	const { request, cookies } = event;
	try {
		// Read requested scopes from cookie (fallback to ["identify"])
		let scopes: string[] = ["identify"];
		const scopesCookie = cookies.get("scopes");
		if (scopesCookie) {
			try {
				const parsed = JSON.parse(scopesCookie);
				if (Array.isArray(parsed) && parsed.length > 0) scopes = parsed;
			} catch {
				// ignore, keep default
			}
		}

		const url = new URL(request.url);
		const code = url.searchParams.get("code");
		if (!code) {
			// No code -> redirect to homepage or return an informative JSON
			return json({ err: "missing_code" }, { status: 400 });
		}

		const {
			DISCORD_BOT_ID,
			DISCORD_SECRET,
			DOMAIN,
			DISCORD_GUILD_ID,
			DISCORD_TOKEN,
			DISCORD_USER_ROLE,
			DISCORD_BOTDEV_ROLE,
			FAILED_DMS_LOGS_CHANNEL_ID,
			LOGS_CHANNEL_ID
		} = env as Record<string, string | undefined>;

		const oauth = new DiscordOauth2({
			clientId: DISCORD_BOT_ID!,
			clientSecret: DISCORD_SECRET!,
			redirectUri: (DOMAIN ? DOMAIN : "http://localhost:5173") + "/api/auth"
		});

		// Exchange code for tokens
		const tokenData = (await oauth.tokenRequest({
			scope: scopes.join(" "),
			code,
			grantType: "authorization_code"
		})) as any;

		// Add expireTimestamp like the old app did (slightly before actual expiry)
		tokenData.expireTimestamp = Date.now() + (Number(tokenData.expires_in) || 0) * 1000 - 10000;

		// Fetch user info from Discord
		const userData = await oauth.getUser(tokenData.access_token);

		// Use Drizzle to query/insert/update user record
		const db = getDb();

		// Try finding existing user
		const existing = await db
			.select({
				id: Users.id,
				keys: Users.keys
			})
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);

		// Helper to normalize keys array
		function normalizeKeys(k: any): any[] {
			if (!k) return [];
			if (typeof k === "string") {
				try {
					const parsed = JSON.parse(k);
					return Array.isArray(parsed) ? parsed : [];
				} catch {
					return [];
				}
			}
			return Array.isArray(k) ? k : [];
		}

		if (existing && existing.length > 0) {
			// Update existing user's keys (merge/refresh logic)
			let user = existing[0] as { id: string; keys: any };
			let keys = normalizeKeys(user.keys);

			// Remove expired keys and keep keys with better scopes
			keys = keys
				.map((k: any) => {
					if (!k) return null;
					try {
						if (k._id) delete k._id;
						if (Number(k.expireTimestamp) && Number(k.expireTimestamp) < Date.now()) {
							return null; // expired
						}
						return k;
					} catch {
						return null;
					}
				})
				.filter(Boolean);

			const currentKey = tokenData;
			// If no key exists or current key has more scopes, add it
			if (
				!keys.length ||
				keys.some(
					(k: any) => (k.scope || "").split(" ").length < (currentKey.scope || "").split(" ").length
				)
			) {
				keys.push(currentKey);
			}

			await db
				.update(Users)
				.set({ keys: JSON.stringify(keys) })
				.where(eq(Users.id, userData.id));
		} else {
			// Insert new user
			const newUser = {
				id: userData.id,
				keys: JSON.stringify([tokenData]),
				added_at: new Date(),
				username: userData.username,
				globalname: (userData as any).global_name ?? null,
				accent_color: (userData as any).accent_color ?? null,
				discriminator: userData.discriminator ?? null,
				avatar: userData.avatar ?? null,
				email: userData.email ?? null,
				bal: 100,
				bio: "The user doesn't have bio set!",
				banner: (userData as any).banner ?? null,
				badges: JSON.stringify([]),
				votes: JSON.stringify([]),
				lang: (userData as any).locale ?? "en-US",
				last_login: new Date().toISOString(),
				nitro: (userData as any).premium_type ?? 0
			};
			await db.insert(Users).values(newUser);

			// ── Referral processing (new users only) ─────────────────────────────
			// The referral code is stored in the "ref" cookie by the login page
			// when the user clicks a ?ref=<code> invite link. We read it once here
			// and delete it so it doesn't linger across future logins.
			const refCode = cookies.get("ref")?.trim();
			if (refCode) {
				cookies.delete("ref", { path: "/" });
				try {
					const referrerId = await resolveReferralCode(refCode);
					// Only proceed if the code resolves to a real, different user.
					if (referrerId && referrerId !== userData.id) {
						const emailVerified = Boolean((userData as any).verified);
						const result = await createReferral(
							referrerId,
							userData.id,
							refCode,
							userData.id, // Discord snowflake == user ID
							emailVerified
							// fingerprint not available server-side at this point;
							// the client will POST it to /api/internals/record-fingerprint
							// after login which will soft-flag the referral if needed.
						);
						if (result) {
							console.info(
								`[auth] Referral created: ${referrerId} → ${userData.id} ` +
									`status=${result.status} ` +
									`(age=${result.accountOldEnough}, email=${result.emailVerified}, ` +
									`fpMatch=${result.fingerprintMatch})`
							);
						}
					}
				} catch (refErr) {
					// Never let referral logic break the login flow.
					console.warn("[auth] Referral processing failed (non-fatal):", refErr);
				}
			}

			// Send welcome log (best-effort)
			try {
				await SendLog({
					env: {
						DOMAIN: DOMAIN ?? "",
						FAILED_DMS_LOGS_CHANNEL_ID: FAILED_DMS_LOGS_CHANNEL_ID ?? "",
						LOGS_CHANNEL_ID: LOGS_CHANNEL_ID ?? "",
						DISCORD_TOKEN: DISCORD_TOKEN ?? ""
					},
					body: {
						title: `${userData.username} account created!`,
						desc: `Hey new user **${(userData as any).global_name ?? userData.username}**\nWelcome to Rovel Discord List!`,
						owners: userData.id,
						img: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}?size=128`,
						url: `${DOMAIN ?? ""}/users/${userData.id}`
					}
				});
			} catch (e) {
				// don't fail the whole flow if logging fails
				console.warn("SendLog failed for new user:", e);
			}
		}

		// Update last_login timestamp
		try {
			await db
				.update(Users)
				.set({ last_login: new Date().toISOString() })
				.where(eq(Users.id, userData.id));
		} catch {
			// ignore update errors (non-fatal)
		}

		// Attempt to auto-join guild (best-effort)
		try {
			await joinServer({
				oauth,
				token: tokenData.access_token,
				env: {
					DISCORD_GUILD_ID: DISCORD_GUILD_ID || "",
					DISCORD_BOT_ID: DISCORD_BOT_ID || "",
					DISCORD_TOKEN: DISCORD_TOKEN || "",
					DISCORD_USER_ROLE: DISCORD_USER_ROLE || ""
				}
			});
		} catch (e) {
			// don't break login on join failure; log via SendLog if available
			try {
				await SendLog({
					env: {
						DOMAIN: DOMAIN ?? "",
						FAILED_DMS_LOGS_CHANNEL_ID: FAILED_DMS_LOGS_CHANNEL_ID ?? "",
						LOGS_CHANNEL_ID: LOGS_CHANNEL_ID ?? "",
						DISCORD_TOKEN: DISCORD_TOKEN ?? ""
					},
					body: {
						title: `Failed to auto-join guild for ${userData.username}`,
						desc: String(e)
					}
				});
			} catch {}
		}

		// Assign the "user" role to anyone who has an account on the website
		// and is a member of the guild. Non-fatal: 404 = not in server yet (fine),
		// any other error is logged inside assignUserRole and swallowed.
		await assignUserRole(userData.id, {
			DISCORD_TOKEN: DISCORD_TOKEN ?? "",
			DISCORD_GUILD_ID: DISCORD_GUILD_ID ?? "",
			DISCORD_USER_ROLE: DISCORD_USER_ROLE ?? ""
		});

		// Send login log (best-effort)
		try {
			await SendLog({
				env: {
					DOMAIN: DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: DISCORD_TOKEN ?? ""
				},
				body: {
					title: `${userData.username} logged in!`,
					desc: `Hello ${(userData as any).global_name ?? userData.username}!`,
					color: "#57F287",
					img: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}?size=128`
				}
			});
		} catch {
			// ignore logging errors
		}

		// Set cookie with access token
		cookies.set("key", tokenData.access_token, {
			path: "/",
			maxAge: Number(tokenData.expires_in) || 3600
		});

		// Handle redirect cookie if present (mirror old behavior)
		const redirectCookie = cookies.get("redirect");
		if (redirectCookie) {
			cookies.delete("redirect", { path: "/" });
			try {
				// Keep only the path+search+hash so SvelteKit's redirect() accepts it
				const parsed = new URL(redirectCookie, "http://localhost");
				parsed.searchParams.set("auth", "1");
				throw redirect(302, parsed.pathname + parsed.search + parsed.hash);
			} catch (e: any) {
				if (e?.status === 302) throw e;
				// fallthrough to default redirect
			}
		}

		// Default redirect to domain root
		throw redirect(302, "/?auth=1");
	} catch (err: any) {
		// Re-throw SvelteKit redirects — they are not errors
		if (err?.status && err.status >= 300 && err.status < 400) throw err;
		console.error("/api/auth error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
