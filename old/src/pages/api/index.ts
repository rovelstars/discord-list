import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }) => {
  return new Response(JSON.stringify({ hello: "world" }), {
    headers: {
      "Content-Type": "application/json",
    }
  });
};