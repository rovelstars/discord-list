import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { withDb } from "$lib/db";
import { Bots, Servers, Users } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";
import { debitPremium } from "$lib/db/queries/referrals";
import { activatePremium } from "$lib/db/queries/index";
import { ECONOMY, canAfford } from "$lib/economy";

/**
 * POST /api/premium/activate
 *
 * Self-serve Premium (Sponsored pin): R$1000 = 1 week of promotion for one
 * owned bot or server. R$ is free-earned only (no payments).
 *
 * Body: { kind: "bot" | "server", id: string }
 * Auth: same `key` pattern as /api/economy/spend (query / Authorization /
 * RDL-key header / `key` cookie).
 *
 * Flow:
 *   1. Validate kind + id (400 invalid_kind / missing_id).
 *   2. Load listing; verify ownership (Bots.owners JSON contains user,
 *      Servers.owner === user) else 403 not_owner. Missing row → 404.
 *   3. Reject when balance < 1000 (400 insufficient_funds).
 *   4. debitPremium(): debit + negative "spend_premium" ledger row.
 *   5. activatePremium(): promoted=1, promoted_until = max(now, current)+7d
 *      (each purchase extends an active pin by a week).
 *
 * Response: 200 { success, newBalance, promoted_until }.
 */
function parseOwners(raw: unknown): string[] {
	try {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw.map(String);
		if (typeof raw === "string") {
			const p: unknown = JSON.parse(raw);
			return Array.isArray(p) ? p.map(String) : [];
		}
		return [];
	} catch {
		return [];
	}
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const url = new URL(request.url);
		const key =
			url.searchParams.get("key") ??
			request.headers.get("authorization") ??
			request.headers.get("RDL-key") ??
			cookies.get("key");
		if (!key) return json({ err: "not_logged_in" }, { status: 400 });

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
		const id = typeof body?.id === "string" ? body.id.trim() : "";
		if (kind !== "bot" && kind !== "server") {
			return json({ err: "invalid_kind" }, { status: 400 });
		}
		if (!id) return json({ err: "missing_id" }, { status: 400 });

		// ── Ownership check ──────────────────────────────────────────────
		if (kind === "bot") {
			let rows: any[];
			try {
				rows = (await withDb((db) =>
					db.select({ id: Bots.id, owners: Bots.owners }).from(Bots).where(eq(Bots.id, id)).limit(1)
				)) as any[];
			} catch {
				return json({ err: "server_error" }, { status: 500 });
			}
			if (!rows || rows.length === 0) return json({ err: "not_found" }, { status: 404 });
			if (!parseOwners(rows[0].owners).includes(String(userData.id))) {
				return json({ err: "not_owner" }, { status: 403 });
			}
		} else {
			const rows = (await withDb((db) =>
				db.select({ id: Servers.id, owner: Servers.owner }).from(Servers).where(eq(Servers.id, id)).limit(1)
			)) as any[];
			if (!rows || rows.length === 0) return json({ err: "not_found" }, { status: 404 });
			if (String(rows[0].owner) !== String(userData.id)) {
				return json({ err: "not_owner" }, { status: 403 });
			}
		}

		// ── Affordability (fast path; debitPremium re-checks atomically) ──
		const cost = ECONOMY.PREMIUM_WEEK_COST;
		const balRows = (await withDb((db) =>
			db.select({ bal: Users.bal }).from(Users).where(eq(Users.id, String(userData.id))).limit(1)
		)) as any[];
		const balRaw = balRows?.[0]?.bal;
		const bal = typeof balRaw === "number" ? balRaw : Number(balRaw) || 0;
		if (!canAfford(bal, cost)) {
			return json({ err: "insufficient_funds", cost }, { status: 400 });
		}

		const debit = await debitPremium(String(userData.id), cost, { kind, id });
		if ("error" in debit) {
			const status = debit.error === "user_not_found" ? 404 : 400;
			return json({ err: debit.error, cost }, { status });
		}

		let promoted_until: string;
		try {
			promoted_until = await activatePremium(kind, id, 1);
		} catch (err) {
			console.error("[premium/activate] activate failed after debit:", err);
			return json({ err: "server_error" }, { status: 500 });
		}

		return json({ success: true, newBalance: debit.newBalance, promoted_until }, { status: 200 });
	} catch (err) {
		console.error("[premium/activate] Unhandled error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
