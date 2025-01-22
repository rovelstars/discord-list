import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }) => {

  return new Response(JSON.stringify({ error: "Not Found" }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      }
    });
};