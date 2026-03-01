import type { APIRoute } from "astro";
import { db, Bots, eq, or } from "astro:db";
export const GET: APIRoute = async ({ params, request }) => {
  const bot = (await db.select({
    id: Bots.id,
    slug: Bots.slug,
    avatar: Bots.avatar,
    username: Bots.username,
    discriminator: Bots.discriminator,
    short: Bots.short,
    votes: Bots.votes,
    servers: Bots.servers,
    invite: Bots.invite,
    bg: Bots.bg,
    desc: Bots.desc,
    badges: Bots.badges,
    github: Bots.source_repo,
    support: Bots.support,
    website: Bots.website,
    owners: Bots.owners,
  }).from(Bots).where(or(eq(Bots.id, params.id), eq(Bots.slug, params.id))))[0];
  if (!bot) return new Response(JSON.stringify({ err: "no_bot_found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify(bot), { headers: { "Content-Type": "application/json" } });
};