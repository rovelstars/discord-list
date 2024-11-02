if (!args.length) {
  message.reply({ content: "Ping a bot or send it's ID too..." });
} else {
  const user = getMention(args[0]);
  if (!user) {
    message.reply({ content: "That doesn't seems to be a valid bot..." });
  } else {
    if (!user.bot) {
      message.reply({ content: "It's not a bot, it's a **__USER__**!" });
    } else {
      Cache.Bots.findOne({ id: user.id }).then((bot) => {
        if (!bot) {
          message.reply({
            content:
              "Sorry but the bot isn't added to RDL.\nIf you're the owner of bot, please add it to RDL 🙏",
          });
        } else {
          message.reply({
            content: `**${bot.username}**'s prefix: \`${bot.prefix}\``,
          });
        }
      });
    }
  }
}
