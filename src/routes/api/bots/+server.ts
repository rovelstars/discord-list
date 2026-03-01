import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { listBots } from "$lib/db/queries";

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limitParam = url.searchParams.get("limit");
		const offsetParam = url.searchParams.get("offset");
		const q = url.searchParams.get("q") || undefined;
		const needNew = url.searchParams.has("new");
		const needTrending = url.searchParams.has("trending");

		const limit = limitParam ? Number(limitParam) : 10;
		const offset = offsetParam ? Number(offsetParam) : 0;

		if (!Number.isFinite(limit) || !Number.isFinite(offset) || limit < 0 || offset < 0) {
			return json({ err: "invalid_number" }, { status: 400 });
		}

		if (limit > 50) {
			return json({ err: "limit_too_high" }, { status: 400 });
		}

		if (needNew && needTrending) {
			return json({ err: "no_multi_sort" }, { status: 400 });
		}

		const bots = await listBots({
			q,
			limit: Math.min(limit, 50),
			offset,
			newFlag: needNew,
			trending: needTrending
		});

		return json(bots, {
			status: 200,
			headers: {
				"Cache-Control": "public, max-age=600, stale-while-revalidate=1200",
				"Content-Type": "application/json"
			}
		});
	} catch (err) {
		console.error("Error in /api/bots GET:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
