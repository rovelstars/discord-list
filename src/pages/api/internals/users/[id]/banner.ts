import type { APIRoute } from "astro";

export async function getBanner(id: string, token: string){
  const res = await fetch(
    `https://discord.com/api/v10/users/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  ).then(res => res.json());
  return res.banner;
}

export const GET: APIRoute = async ({ locals, params }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  const banner = await getBanner(params.id, env.DISCORD_TOKEN);
  return new Response(JSON.stringify({banner}), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
