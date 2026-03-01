import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * GET /api/discord/user/[id]
 *
 * Proxies a Discord user lookup using the configured bot token.
 * Used client-side on the "Add a New Bot" form to resolve a bot ID
 * into display info (username, discriminator, avatar) without a page reload.
 *
 * Response shape on success:
 *   { id, username, discriminator, avatar }
 *
 * Error responses:
 *   { err: 'missing_token' }   — DISCORD_TOKEN not configured
 *   { err: 'not_found' }       — Discord returned 404 / 10013
 *   { err: 'not_a_bot' }       — The resolved user is not a bot
 *   { err: 'discord_error', status: number } — any other Discord API error
 *   { err: 'server_error' }    — unexpected exception
 */
export const GET: RequestHandler = async ({ params }) => {
	const userId = params.id?.trim();
	if (!userId) {
		return json({ err: 'missing_id' }, { status: 400 });
	}

	const token = env.DISCORD_TOKEN;
	if (!token) {
		console.error('[discord/user] DISCORD_TOKEN is not configured');
		return json({ err: 'missing_token' }, { status: 500 });
	}

	try {
		const discordRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
			headers: { Authorization: `Bot ${token}` }
		});

		if (discordRes.status === 404) {
			return json({ err: 'not_found' }, { status: 404 });
		}

		if (!discordRes.ok) {
			const body = await discordRes.json().catch(() => ({}));
			// Discord error code 10013 = Unknown User
			if (body?.code === 10013) {
				return json({ err: 'not_found' }, { status: 404 });
			}
			return json({ err: 'discord_error', status: discordRes.status }, { status: 502 });
		}

		const user = await discordRes.json();

		// Ensure the resolved account is actually a bot application
		if (!user.bot) {
			return json({ err: 'not_a_bot' }, { status: 422 });
		}

		return json(
			{
				id: user.id as string,
				username: (user.global_name ?? user.username) as string,
				discriminator: (user.discriminator ?? '0') as string,
				avatar: (user.avatar ?? null) as string | null
			},
			{
				status: 200,
				headers: {
					// Short cache — bot profiles rarely change, but don't stale forever
					'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
				}
			}
		);
	} catch (err) {
		console.error('[discord/user] Unexpected error:', err);
		return json({ err: 'server_error' }, { status: 500 });
	}
};
