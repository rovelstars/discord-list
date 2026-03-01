/*
router.get("/:id/slug", (req, res) => {
  if (!req.query.key) return res.json({ err: "no_key" });
  fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
    .then((r) => r.json())
    .then(async (d) => {
      if (d.err) return res.json({ err: "invalid_key" });

      var bot = Cache.Bots.findOneById(req.params.id);
      if (!bot) return await res.json({ err: "no_bot_found" });
      if (bot.owners.includes(d.id)) {
        if (req.query.slug) {
          Cache.Bots.findOne({ slug: req.query.slug }).then(async (bb) => {
            if (bb && bb?.id != bot.id) {
              res.json({ err: "used_slug" });
            } else {
              bot.slug = sluggy(req.query.slug == "" ? bot.id : req.query.slug);
              bot.save();
              await res.json({ slug: bot.slug });
            }
          });
        } else res.json({ slug: bot.slug });
      }
      if (!bot.owners.includes(d.id)) {
        return await res.json({ err: "unauth" });
      }
    });
});
*/

import type { APIRoute } from "astro";
import { db, Bots, eq } from "astro:db";
export const POST: APIRoute = async ({ params, request }) => {
  return new Response("Not implemented", { status: 501 });
};