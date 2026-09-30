import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { withDb } from "$lib/db";
import { Users } from "$lib/schema";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";
import { debitSpend } from "$lib/db/queries/referrals";
import { spendCost } from "$lib/economy";

/**
 * POST /api/economy/spend
 *
 * Cosmetic-only R$ spend sink. Spends NEVER buy votes, ranking, or
 * visibility in vote-ordered lists - they unlock a cosmetic badge that
 * renders on the buyer's own profile/cards.
 *
 * Body: { kind: "profile_border" | "listing_accent" | "rising_slot" }
 *
 * Auth: same `key` pattern as the vote endpoints (query, Authorization /
 * RDL-key header, or `key` cookie).
 *
 * Flow (all-or-nothing per request):
 *   1. Validate kind against the ECONOMY catalogue (unknown → 400).
 *   2. Reject when the cosmetic badge is already owned (idempotent).
 *   3. debitSpend(): balance check + debit + negative-amount
 *      "spend_cosmetic" milestone row for dashboard history.
 *   4. Append `cosmetic:<kind>` to Users.badges so the UI can render it.
 *
 * Response:
 *   200 { success: true, newBalance }
 *   400 { err: not_logged_in | invalid_key | invalid_kind | already_owned | insufficient_funds }
 *   404 { err: user_not_found }
 */

function badgeFor(kind: string): string {
	return `cosmetic:${kind}`;
}

function parseBadges(raw: unknown): string[] {
	try {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw.map(String);
		if (typeof raw === "string") {
			const parsed: unknown = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed.map(String) : [];
		}
		return [];
	} catch {
		return [];
	}
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const url = new URL(request.url);
		const paramKey = url.searchParams.get("key");
		const headerAuth = request.headers.get("authorization") ?? request.headers.get("RDL-key");
		const cookieKey = cookies.get("key");

		const key = paramKey ?? headerAuth ?? cookieKey;
		if (!key) {
			return json({ err: "not_logged_in" }, { status: 400 });
		}

		const oauth = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth.getUser(String(key));
		} catch {
			try {
				cookies.delete("key", { path: "/" });
			} catch {}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		let body: any;
		try {
			body = await request.json();
		} catch {
			return json({ err: "invalid_kind" }, { status: 400 });
		}

		const kind = typeof body?.kind === "string" ? body.kind : "";
		const cost = spendCost(kind);
		if (cost === null) {
			return json({ err: "invalid_kind" }, { status: 400 });
		}

		const userRows = await withDb((db) =>
			db
				.select({ bal: Users.bal, badges: Users.badges })
				.from(Users)
				.where(eq(Users.id, userData.id))
				.limit(1)
		);
		if (!userRows || userRows.length === 0) {
			return json({ err: "user_not_found" }, { status: 404 });
		}

		const owned = parseBadges((userRows[0] as any).badges);
		if (owned.includes(badgeFor(kind))) {
			return json({ err: "already_owned" }, { status: 400 });
		}

		const result = await debitSpend(userData.id, kind, cost, { recipient: "self" });
		if ("error" in result) {
			const status = result.error === "user_not_found" ? 404 : 400;
			return json({ err: result.error }, { status });
		}

		try {
			await withDb((db) =>
				db
					.update(Users)
					.set({ badges: JSON.stringify([...owned, badgeFor(kind)]) })
					.where(eq(Users.id, userData.id))
			);
		} catch (err) {
			// Balance already debited and ledger row written; the badge is
			// display-only so log and still report success.
			console.warn(
				"[economy/spend] badge append failed (non-fatal):",
				err instanceof Error ? err.message : String(err)
			);
		}

		return json({ success: true, newBalance: result.newBalance }, { status: 200 });
	} catch (err) {
		console.error("[economy/spend] Unhandled error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
