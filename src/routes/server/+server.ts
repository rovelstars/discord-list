import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	throw redirect(302, 'https://discord.com/invite/eWbt297SkU');
};
