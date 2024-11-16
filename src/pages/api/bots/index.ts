import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  return new Response(
    JSON.stringify(
      await fetch("https://discord.rovelstars.com/api/bots/top").then(res =>
        res.json(),
      ),
    ),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}