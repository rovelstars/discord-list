import type { LayoutServerLoad } from './$types';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';
import { withDb, type DrizzleDb } from '$lib/db';
import { Users } from '$lib/schema';
import { eq, like } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const key = cookies.get('key');

	if (!key) {
		return { user: null };
	}

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? 'http://localhost:5173') + '/api/auth'
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
				// No matching user record at all — clear bad cookie
				cookies.delete('key', { path: '/' });
				return { user: null };
			}

			// Normalize keys array (stored as JSON TEXT)
			let keys: any[] = [];
			try {
				const raw = (result[0] as any).keys;
				if (typeof raw === 'string') keys = JSON.parse(raw);
				else if (Array.isArray(raw)) keys = raw;
			} catch {
				keys = [];
			}

			// Drop expired keys
			keys = keys.filter((k: any) => k && Number(k.expireTimestamp) > Date.now());

			if (keys.length === 0) {
				cookies.delete('key', { path: '/' });
				return { user: null };
			}

			// Try to refresh using the first live key's refresh token
			const keyData = keys[0];
			try {
				const tokenData: any = await oauth.tokenRequest({
					grantType: 'refresh_token',
					refreshToken: keyData.refresh_token,
					scope: keyData.scope ?? 'identify'
				});

				tokenData.expireTimestamp =
					Date.now() + (Number(tokenData.expires_in) || 0) * 1000 - 10_000;

				// Persist new token
				cookies.set('key', tokenData.access_token, {
					path: '/',
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
				cookies.delete('key', { path: '/' });
				return { user: null };
			}
		} catch {
			cookies.delete('key', { path: '/' });
			return { user: null };
		}
	}

	if (!userData) {
		return { user: null };
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

	return {
		user: {
			id: userData.id as string,
			username: (userData.global_name ?? userData.username) as string,
			tag: userData.username as string,
			discriminator: (userData.discriminator ?? '0') as string,
			avatar: (userData.avatar ?? null) as string | null,
			bal
		}
	};
};
