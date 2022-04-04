client.once("ready", () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
  activities_list = [
    "with all the bots on RDL",
    "with the members on RDL",
    "on discord.rovelstars.com",
    "and Coding!",
    "and Checking all Bots are fine or not",
    "Never gonna let you down!",
    "on https://discord.gg/E6PhZK4tU9",
    "and defeating top.gg!",
    "and wondering what's next?",
    "Among Us",
    "Minecraft",
    "Discord",
    "Rovel Discord List",
    "and fixing issues on RDL",
    "and checking emails on support@rovelstars.com",
  ];
  setInterval(() => {
    const index = Math.floor(Math.random() * (activities_list.length - 1) + 1);
    client.user.setActivity(activities_list[index]);
  }, 10000);
  setInterval(() => {
    console.log(`[BOT] Syncing All Bot Statuses!`);
    client.guilds.cache.get("602906543356379156").me.setNickname(`ROVEL BOT | Watching ${Cache.AllBots.length} Bots`);
    Cache.AllBots.forEach(bot => {
      bot.status = client.guilds.cache.get("602906543356379156").members.cache.get(bot.id)?.presence?.status || "online";
      bot.save();
    })
  }, 60000);
});
