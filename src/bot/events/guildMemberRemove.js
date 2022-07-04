client.on("guildMemberRemove", (member) => {
  if (member.guild.id == "602906543356379156") {
    const channel = member.guild.channels.cache.find(
      (ch) => ch.name === "welcome・logs"
    );
    if (channel) {
      channel.send(`R.I.P ${member.user.tag}, why did you leave bro?`);
    }

    if (!member.user.bot) {
      var bots = Cache.Bots.findByOwner(member.user.id);
      for (const bot of bots) {
        if (bot.owners[0] == member.user.id) {
          Cache.Bots.deleteOne({ id: bot.id }, function (err) {
            fetch(`${process.env.DOMAIN}/api/client/log`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.SECRET,
                desc: `Bot ${bot.tag} (${bot.id}) has been deleted because the main owner (${member.user.tag})left the server.\nThe data deleted is:\n**Votes:** ${bot.votes}\nIncase he left accidentally, the above data may be added back again manually if the bot is added back to RDL`,
                title: "Bot Deleted!",
                color: "#ff0000",
                owners: bot.owners,
                img: bot.avatarURL,
                url: `${process.env.DOMAIN}`,
              }),
            });
          });
        }
      }
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
