import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';

/**
 * GET /login
 *
 * Query params:
 *   servers  - "true" | "false"  (request guilds.join scope)
 *   email    - "true" | "false"  (request email scope)
 *   redirect - path to return to after auth (falls back to cookie, then "/")
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const wantServers = url.searchParams.get('servers') !== 'false';
	const wantEmail = url.searchParams.get('email') !== 'false';
	const redirectParam = url.searchParams.get('redirect');

	// Build the scope list
	const scopes = ['identify'];
	if (wantEmail) scopes.push('email');
	if (wantServers) scopes.push('guilds.join');

	// Persist scopes so the callback (/api/auth) can use them
	cookies.set('scopes', JSON.stringify(scopes), {
		path: '/',
		maxAge: 60 * 10, // 10 minutes — just long enough for the OAuth round-trip
		sameSite: 'lax',
		httpOnly: true
	});

	// Persist redirect target
	const redirectTo = redirectParam || cookies.get('redirect') || '/';
	cookies.set('redirect', redirectTo, {
		path: '/',
		maxAge: 60 * 10,
		sameSite: 'lax',
		httpOnly: true
	});

	const domain = (env.DOMAIN ?? 'http://localhost:5173').replace(/\/$/, '');

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: `${domain}/api/auth`
	});

	const authUrl = oauth.generateAuthUrl({
		scope: scopes,
		responseType: 'code'
	});

	throw redirect(302, authUrl);
};
