import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = () => {
	return new Response(null, {
		status: 301,
		headers: {
			Location: "/favicon.svg"
		}
	});
};
