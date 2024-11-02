Cache.Bots.find({ added: false }).then(async (bots) => {
  if (bots.length == 0) {
    message.reply("No Bots in queue! Enjoy your free time!!");
  } else {
    bots = bots.slice(0, 11);
    if (args.includes("-t")) {
      let msg = `> Showing the Oldest ${bots.length} Bot(s) for testing:\n`;
      for await (const bot of bots) {
        await fetch(`${process.env.DOMAIN}/api/client/mainserver/${bot.id}`)
          .then((r) => r.json())
          .then(async (d) => {
            if (!d.condition) {
              msg += (await (bot.id.startsWith("1") || bot.id.startsWith("2")))
                ? `<${bot.invite}&permissions=0&guild_id=730667178889707622> - ${bot.tag} [⚠️ OLD BOT]\n`
                : `<https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=0&scope=bot%20applications.commands&guild_id=730667178889707622> - ${bot.tag}\n`;
            }
          });
      }
      await message.channel.send(msg);
    } else {
      let msg = `> Showing the Oldest ${bots.length} Bot(s) that are not added to this server:\n`;
      for await (const bot of bots) {
        await fetch(`${process.env.DOMAIN}/api/client/mainserver/${bot.id}`)
          .then((r) => r.json())
          .then(async (d) => {
            if (!d.condition) {
              msg += (await (bot.id.startsWith("1") || bot.id.startsWith("2")))
                ? `<${bot.invite}&permissions=0&guild_id=602906543356379156> - ${bot.tag} [⚠️ OLD BOT]\n`
                : `<https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=0&scope=bot&guild_id=602906543356379156> - ${bot.tag}\n`;
            }
          });
      }
      await message.channel.send(msg);
    }
  }
});
