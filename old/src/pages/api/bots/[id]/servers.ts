/*
router.post("/:id/servers", (req, res) => {
  if (!req.query.code) return res.json({ err: "no_code" });
  if (isNaN(req.body.count)) return res.json({ err: "NaN" });
  Cache.Bots.findOne({ code: req.query.code, id: req.params.id }).then((b) => {
    if (!b) return res.json({ err: "invalid_code" });
    else {
      b.servers = req.body.count;
      b.save();
      res.json({ success: true });
    }
  });
});
*/

import type { APIRoute } from "astro";
import {db, Bots, eq, and} from "astro:db";
export const POST: APIRoute = async ({ params, request }) => {
  //get id from params, and code from query or authentification header
  const id = params.id;
  const code = new URL(request.url).searchParams.get("code") || request.headers.get("Authorization") || request.headers.get("RDL-code");
  if(!code) return new Response(JSON.stringify({ err: "no_code" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const bot = (await db.select({votes: Bots.votes}).from(Bots).where(and(eq(Bots.code, code), eq(Bots.id, id))))[0];
  if(!bot) return new Response(JSON.stringify({ err: "invalid_code" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  if(isNaN(body.count)) return new Response(JSON.stringify({ err: "NaN" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await db.update(Bots).set({servers: body.count}).where(and(eq(Bots.code, code), eq(Bots.id, id)));
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};