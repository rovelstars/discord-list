import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getClient } from "$lib/db";

function validateSecret(request: Request, url: URL): { ok: boolean; misconfigured: boolean } {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) {
		return { ok: false, misconfigured: true };
	}

	const supplied = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	return { ok: supplied === internalSecret, misconfigured: false };
}

/**
 * POST /api/internals/migrate-servers
 *
 * One-shot migration: adds the five guild-snapshot columns to the Servers table
 * if they don't already exist. Safe to call multiple times - each ALTER TABLE
 * is wrapped in a try/catch so already-existing columns are silently skipped.
 *
 * Auth: X-Internal-Secret header or ?secret= query param.
 *
 * Response:
 *   200  { success: true, results: Array<{ column, status: 'added' | 'already_exists' | 'error', detail? }> }
 *   401  { error: 'Unauthorized' }
 *   500  { error: string }
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const { ok, misconfigured } = validateSecret(request, url);

	if (misconfigured) {
		console.error("[migrate-servers] INTERNAL_SECRET env var is not set.");
		return json(
			{ error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	if (!ok) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const migrations: Array<{ column: string; sql: string }> = [
		{
			column: "member_count",
			sql: `ALTER TABLE "Servers" ADD COLUMN "member_count" INTEGER`
		},
		{
			column: "presence_count",
			sql: `ALTER TABLE "Servers" ADD COLUMN "presence_count" INTEGER`
		},
		{
			column: "channels",
			sql: `ALTER TABLE "Servers" ADD COLUMN "channels" TEXT NOT NULL DEFAULT '[]'`
		},
		{
			column: "has_nsfw",
			sql: `ALTER TABLE "Servers" ADD COLUMN "has_nsfw" INTEGER NOT NULL DEFAULT 0`
		},
		{
			column: "synced_at",
			sql: `ALTER TABLE "Servers" ADD COLUMN "synced_at" TEXT`
		}
	];

	const client = getClient();

	const results: Array<{
		column: string;
		status: "added" | "already_exists" | "error";
		detail?: string;
	}> = [];

	for (const { column, sql } of migrations) {
		try {
			await client.execute(sql);
			console.log(`[migrate-servers] Added column: ${column}`);
			results.push({ column, status: "added" });
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			// Turso/SQLite surfaces duplicate-column as "duplicate column name: <col>"
			if (msg.toLowerCase().includes("duplicate column") || msg.toLowerCase().includes("already exists")) {
				console.log(`[migrate-servers] Column already exists, skipping: ${column}`);
				results.push({ column, status: "already_exists" });
			} else {
				console.error(`[migrate-servers] Failed to add column ${column}:`, err);
				results.push({ column, status: "error", detail: msg });
			}
		}
	}

	const hasError = results.some((r) => r.status === "error");

	return json(
		{ success: !hasError, results },
		{ status: hasError ? 500 : 200 }
	);
};
