import UserAccountFetch from "@/functions/user-bot";
import type { Env } from "@/lib/env";
import type { APIRoute } from "astro";
import { db, Bots, eq } from "astro:db";

export const GET: APIRoute = async ({ locals, params, request }) => {
  console.log(params.id);
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  let data = await UserAccountFetch(`/oauth2/authorize?client_id=${params.id}&scope=bot`, env as Env);
  if ((await db.select({ servers: Bots.servers }).from(Bots).where(eq(Bots.id, params.id)).limit(1))[0].servers == data.bot.approximate_guild_count) return new Response(JSON.stringify({ success: false }), { status: 200, headers: { "content-type": "application/json" } });
  await db.update(Bots).set({ servers: data.bot.approximate_guild_count }).where(eq(Bots.id, params.id));
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
};