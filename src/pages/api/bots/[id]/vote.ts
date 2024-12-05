import type { APIRoute } from "astro";
import DiscordOauth2 from "discord-oauth2";
import { db, Bots, Users, eq, and } from "astro:db";
import SendLog from "@/bot/log";
import type { Env } from "@/lib/env";
import getAvatarURL from "@/lib/get-avatar-url";
export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
  const env = locals.runtime?.env ?? process.env;
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("Authorization") ?? request.headers.get("RDL-key") ?? cookies.get("key")?.value;
  let queryCoins: number | string = new URL(request.url).searchParams.get("coins");
  //get id from params, and code from query or authentification header
  const id = params.id;
  if (!key) return new Response(JSON.stringify({ err: "not_logged_in" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const oauth2 = new DiscordOauth2({
    clientId: env.DISCORD_BOT_ID,
    clientSecret: env.DISCORD_SECRET,
    redirectUri: env.DOMAIN + "/api/auth",
  });
  const userData = await oauth2.getUser(key);
  const user = (await db.select({ bal: Users.bal, votes: Users.votes }).from(Users).where(eq(Users.id, userData.id)))[0] as { bal: number, votes: { bot: string, at: number }[] };
  if (!user) return new Response(JSON.stringify({ err: "invalid_key" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const bot = (await db.select({ votes: Bots.votes, opted_coins: Bots.opted_coins, webhook: Bots.webhook, code: Bots.code, username: Bots.username, avatar: Bots.avatar, owners: Bots.owners }).from(Bots).where(eq(Bots.id, id)))[0];
  if (!bot) return new Response(JSON.stringify({ err: "no_bot_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
  let votingType = bot.opted_coins ? "coins" : "time";
  if (queryCoins && !bot.opted_coins) return new Response(JSON.stringify({ err: "invalid_voting_type" }), { headers: { "Content-Type": "application/json" } });
  if (queryCoins && bot.opted_coins) {
    queryCoins = parseInt(queryCoins);
    if (isNaN(queryCoins)) return new Response(JSON.stringify({ err: "invalid_coins" }), { headers: { "Content-Type": "application/json" } });
    if (queryCoins < 1) return new Response(JSON.stringify({ err: "invalid_coins" }), { headers: { "Content-Type": "application/json" } });
    //coins should be divisble by 10. 10 coins = 1 vote
    if (queryCoins % 10 !== 0) return new Response(JSON.stringify({ err: "coins_not_divisble_by_10" }), { headers: { "Content-Type": "application/json" } });
    if (user.bal < queryCoins) return new Response(JSON.stringify({ err: "insufficient_coins" }), { headers: { "Content-Type": "application/json" } });
    user.bal -= queryCoins;
  }
  const lastVote = user.votes.find(vote => vote.bot === id);
  //try after is a human readable time, that denotes when the user can vote again. If the user can vote again, try_after should be null
  let try_after = null;
  if (lastVote) {
    let time = 86400000 - (Date.now() - lastVote.at);
    if (time > 0) {
      try_after = new Date(time).toISOString().substr(11, 8);
    }
  }
  //try_after should be a user readable time
  if ((lastVote && lastVote.at > Date.now() - 86400000) && !bot.opted_coins) return new Response(JSON.stringify({ err: "cooldown", try_after }), { headers: { "Content-Type": "application/json" } });
  //if the user has voted for the bot before, remove the vote
  user.votes = user.votes.filter(vote => vote.bot !== id);
  if (!bot.opted_coins) {
    user.votes.push({ bot: id, at: Date.now() }); //no cooldown for RDL coins.
  }
  //@ts-ignore
  bot.votes = bot.opted_coins ? bot.votes + parseInt(queryCoins) / 10 : bot.votes + 1;
  await db.update(Users).set({ bal: user.bal, votes: user.votes }).where(eq(Users.id, userData.id));
  await db.update(Bots).set({ votes: bot.votes }).where(eq(Bots.id, id));
  if (bot.webhook) {
    const body = {
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        bal: user.bal,
      },
      coins: queryCoins,
      //@ts-ignore
      votes: bot.opted_coins ? parseInt(queryCoins) / 10 : 1,
      currentVotes: bot.votes,
    };
    fetch(`${bot.webhook}?code=${bot.code}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: bot.code,
      },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (r.status >= 300 || r.status < 200) {
          await SendLog({
            env: env as Env,
            body: {
              title: `Failed to send data to ${bot.username} (${id})`,
              desc: `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${JSON.stringify(body)}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
              color: "#ED4245",
              img: getAvatarURL(id, bot.avatar),
            }
          })
        }
      })
      .catch((e) => {
        fetch(`${process.env.DOMAIN}/api/client/log`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            secret: process.env.SECRET,
            title: `Failed to send data to ${bot.username} (${id})`,
            desc: `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${JSON.stringify(body)}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
            owners: bot.owners,
            img: getAvatarURL(id, bot.avatar),
          }),
        });
      });
  }
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
};