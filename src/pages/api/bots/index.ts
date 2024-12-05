import type { APIRoute } from 'astro';
import { db, Bots, like, or, desc, asc } from 'astro:db';
export const GET: APIRoute = async ({ params, request }) => {
  let url = new URL(request.url);

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const needNew = url.searchParams.has("new") ? true : false;
  const needTrending = url.searchParams.has("trending") ? true : false;

  if (needNew && needTrending) {
    return new Response(JSON.stringify({ err: "no_multi_sort" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  if (url.searchParams.get("q")) {
    //search for bots
    const bots = await db.select({
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
    }).from(Bots)
      .orderBy(needNew ? desc(Bots.added_at) : needTrending ? desc(Bots.votes) : null)
      .where(or(like(Bots.username, `%${url.searchParams.get("q")}%`), like(Bots.short, `%${url.searchParams.get("q")}%`)))
      .limit(limit).offset(offset);
    return new Response(JSON.stringify(bots), {
      headers: {
        "content-type": "application/json"
      }
    });
  }
  else {
    const bots = await db.select({
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
    }).from(Bots).limit(limit).offset(offset);
    return new Response(JSON.stringify(bots), {
      headers: {
        "content-type": "application/json"
      }
    });
  }
}