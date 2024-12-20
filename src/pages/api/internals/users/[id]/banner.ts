import type { APIRoute } from "astro";
import { DISCORD_TOKEN } from "astro:env/server";

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

export const GET: APIRoute = async ({  params }) => {
  const banner = await getBanner(params.id, DISCORD_TOKEN);
  return new Response(JSON.stringify({banner}), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
