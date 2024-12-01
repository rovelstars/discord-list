import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, params, request,cookies }) => {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/img/bot/logo-36.png",
    },
  });
}