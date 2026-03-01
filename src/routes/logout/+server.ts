import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// Called directly by the browser (e.g. a link or window.location)
export const GET: RequestHandler = async ({ url, cookies }) => {
	cookies.delete('key', { path: '/' });

	const redirectTo = url.searchParams.get('redirect') || '/';
	throw redirect(302, redirectTo);
};

// Called via fetch() from the navbar logout button
export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('key', { path: '/' });

	return new Response(null, { status: 200 });
};
