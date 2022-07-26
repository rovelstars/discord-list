client.on("guildMemberRemove", (member) => {
  if (member.guild.id == "602906543356379156") {
    const channel = member.guild.channels.cache.find(
      (ch) => ch.name === "welcome・logs"
    );
    if (channel) {
      channel.send(`R.I.P ${member.user.tag}, why did you leave bro?`);
    }

    if (member.user.bot) {
      Cache.Bots.findOne({ id: member.user.id }).then((bot) => {
        if (!bot) return;
        if (bot.added) {
          bot.added = false;
          const msg = new Discord.MessageEmbed()
            .setTitle(`${bot.tag} Stopped Listing!`)
            .setColor("#FF0000")
            .setDescription(
              `**${bot.tag}** has been removed from our server and had been stopped getting listed from now on until it's added back!`
            )
            .setTimestamp()
            .setThumbnail(bot.avatarURL);
          bot.save();
          client.guilds.cache
            .get("602906543356379156")
            .channels.cache.get("889696494758789191")
            .send({ embeds: [msg] })
            .catch((e) => {});
          if (bot.owners) {
            for (const owner of bot.owners) {
              client.users.cache.get(owner).send({ embeds: [msg] });
            }
          }
        }
      });
    }
  }
});
