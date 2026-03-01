import type { APIRoute } from "astro";
import { DOMAIN } from "astro:env/server";
import { db, Bots } from 'astro:db';

export const GET: APIRoute = async ({ params, request }) => {
  const botsmap = (await db
    .select({
      id: Bots.id,
      slug: Bots.slug,
    }).from(Bots)).map((bot) => {
      return `<url>\n<loc>${DOMAIN}/bots/${bot.id}</loc>\n<priority>0.80</priority><changefreq>weekly</changefreq>\n</url>${bot.slug && bot.slug !== bot.id ? `<url>\n<loc>${DOMAIN}/bots/${bot.slug}</loc>\n<priority>0.80</priority><changefreq>weekly</changefreq>\n</url>` : ""}`;
    }).join("\n");

  const Sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' +
    `\n<url>\n<loc>${DOMAIN}/</loc>\n<priority>1.00</priority><changefreq>weekly</changefreq>\n</url>\n` +
    botsmap +
    "</urlset>";
  return new Response(Sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    }
  });
};