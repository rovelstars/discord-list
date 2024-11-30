import type { APIRoute } from "astro";
import DiscordOauth2 from "discord-oauth2";
import { db, Bots, Users, eq, and } from "astro:db";
export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
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
  const bot = (await db.select({ votes: Bots.votes, opted_coins: Bots.opted_coins, webhook: Bots.webhook, code: Bots.code }).from(Bots).where(eq(Bots.id, id)))[0];
  if (!bot) return new Response(JSON.stringify({ err: "no_bot_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
  let votingType = bot.opted_coins ? "coins" : "time";
  if (votingType == "time") {
    if (!user.votes) user.votes = [];
    //find the bot from votes: [{bot, at}]
    let vote = user.votes.find((b) => b.bot == id);
    let allow = false;
    if (vote) {
      //check if Vote.at is older than 24 hours
      if (Date.now() - vote.at > 86400000) {
        //if it is older than 24 hours, remove it from the votes array
        user.votes = user.votes.filter((b) => b.bot != id);
        allow = true;
      }
    }
    if (!vote) allow = true;
    if (allow) {
      //we can approve the vote
      user.votes.push({ bot: id, at: Date.now() });
      await db.update(Users).set({ votes: user.votes }).where(eq(Users.id, userData.id));
      bot.votes = bot.votes + 1;
      await db.update(Bots).set({ votes: bot.votes }).where(eq(Bots.id, id));

      if (bot.webhook) {
        const postdata = JSON.stringify({
          user: { id: userData.id, bal: user.bal, votes: user.votes, username: userData.username, avatar: userData.avatar },
          id: userData.id,
          coins: 10,
          votes: 1,
          currentVotes: bot.votes,
        });

        fetch(`${bot.webhook}?code=${bot.code}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: bot.code,
          },
          body: postdata,
        })
          .then((r) => {
            //TODO: log this error
            return;
            /*
            if (r.status >= 300 || r.status < 200) {
              fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  secret: Deno.env.get("SECRET"),
                  title: `Failed to send data to ${bot.tag}`,
                  desc: `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                  owners: bot.owners,
                  img: bot.avatarURL,
                }),
              });
            }
              */
          })
          .catch((e) => {
            //TODO: log this error
            return;
            /*
            fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                secret: Deno.env.get("SECRET"),
                title: `Failed to send data to ${bot.tag}`,
                desc: `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                owners: bot.owners,
                img: bot.avatarURL,
              }),
            });
            */
          });
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      }
    } else {
      let start = new Date(vote.at);
      start.setDate(start.getDate() + 1);
      let start2 = new Date();
      let ree = Math.floor((start.getTime() - start2.getTime()) / 1000);
      function secondsToHms(d) {
        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor((d % 3600) / 60);
        var s = Math.floor((d % 3600) % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
        var mDisplay =
          m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return hDisplay + mDisplay + sDisplay;
      }
      return new Response(JSON.stringify({ success: false, try_after: secondsToHms(ree) }), { headers: { "Content-Type": "application/json" } });
    }
  } else if (votingType == "coins") {
    if (!queryCoins) return new Response(JSON.stringify({ err: "no_coins" }), { status: 400, headers: { "Content-Type": "application/json" } });
    queryCoins = parseInt(queryCoins);
    if (isNaN(queryCoins)) return new Response(JSON.stringify({ err: "NaN" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (queryCoins <= 0) return new Response(JSON.stringify({ err: "negative_coins" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (queryCoins % 10 != 0)
      return new Response(JSON.stringify({ err: "coins_not_divisible" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const vote = queryCoins / 10;
    if (user.bal < queryCoins)
      return new Response(JSON.stringify({ err: "not_enough_coins" }), { status: 400, headers: { "Content-Type": "application/json" } });
    user.bal = user.bal - queryCoins;
    await db.update(Users).set({ bal: user.bal }).where(eq(Users.id, userData.id));
    bot.votes = bot.votes + vote;
    await db.update(Bots).set({ votes: bot.votes }).where(eq(Bots.id, id));;
    if (bot.webhook) {
      const hmm = JSON.stringify({
        user: { id: userData.id, bal: user.bal, votes: user.votes, username: userData.username, avatar: userData.avatar },
        coins: queryCoins,
        votes: vote,
        currentVotes: bot.votes,
      });
      fetch(`${bot.webhook}?code=${bot.code}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bot.code,
        },
        body: hmm,
      })
        .then((r) => {
          //TODO: log this error
          return;
          /*
          if (r.status >= 300 || r.status < 200) {
            fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                secret: Deno.env.get("SECRET"),
                title: `Failed to send data to ${bot.tag}`,
                desc: `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                owners: bot.owners,
                img: bot.avatarURL,
              }),
            });
          }
            */
        })
        .catch((e) => {
          //TODO: log this error
          return;
          /*
          fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              secret: Deno.env.get("SECRET"),
              title: `Failed to send data to ${bot.tag}`,
              desc: `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
              owners: bot.owners,
              img: bot.avatarURL,
            }),
          });
          */
        });
    }
  }
  //shouldnt come to this point. If it does, then bot data is messed up :skull:
  return new Response(JSON.stringify({ err: "invalid_voting_type" }), { headers: { "Content-Type": "application/json" } });
};