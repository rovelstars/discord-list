import type { APIRoute } from "astro";
import { DOMAIN } from "astro:env/server";

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/`.trim(),
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
};
export const prerender = true;
