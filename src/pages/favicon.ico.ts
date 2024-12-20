import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ }) => {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/img/bot/logo-36.png",
    },
  });
}