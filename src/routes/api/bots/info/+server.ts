import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { Bots } from '$lib/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/bots/info
 *
 * This endpoint returns bot information for a bot identified by its secret `code`.
 * The `code` may be supplied either as:
 *  - Authorization header (e.g. `Authorization: <code>` or `Authorization: Bearer <code>`)
 *  - `RDL-code` header
 *  - query parameter `code`
 *
 * Response:
 *  - 200: JSON array of matching bot objects (legacy behaviour returned an array)
 *  - 400: { err: 'no_code' } when no code provided
 *  - 500: { err: 'server_error', message?: string } on unexpected errors
 */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Prefer authorization headers, then query param
		const headerAuth =
			request.headers.get('authorization') ??
			request.headers.get('RDL-code') ??
			request.headers.get('RDL-Code');
		let code = headerAuth ?? url.searchParams.get('code');

		if (!code) {
			return json({ err: 'no_code' }, { status: 400 });
		}

		// Support `Bearer <token>` style headers by stripping the prefix
		if (typeof code === 'string' && code.toLowerCase().startsWith('bearer ')) {
			code = code.slice(7).trim();
		}

		const db = getDb();

		const botRows = await db
			.select({
				id: Bots.id,
				username: Bots.username,
				short: Bots.short,
				avatar: Bots.avatar,
				votes: Bots.votes,
				servers: Bots.servers,
				added_at: Bots.added_at
			})
			.from(Bots)
			.where(eq(Bots.code, String(code)));

		return json(botRows, {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		console.error('/api/bots/info error:', err);
		return json(
			{ err: 'server_error', message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
