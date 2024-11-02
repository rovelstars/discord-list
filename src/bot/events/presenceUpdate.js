client.on("presenceUpdate", (olduserr, newuser) => {
  try {
    let olduser;
    olduser.userID = olduserr ? olduserr.userID : newuser.userID;
    olduser.status = olduserr ? olduserr.status : "offline";
    const status = {
      old: olduser ? olduser.status : "offline",
      new: newuser.status,
    };
    if (status.old !== status.new) {
      Bots.findOne({ id: olduser.userID }).then((bot) => {
        if (bot) {
          let off = false;
          if (bot.status !== status.new) {
            if (status.new == "offline") off = true;
            bot.status = status.new;
            bot.save();
            if (off) {
              const msg = new Discord.MessageEmbed()
                .setTitle(`${bot.tag} is OFFLINE`)
                .setColor("#36393f")
                .setDescription(`${bot.username} (${bot.id}) is Offline!`)
                .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
                .setTimestamp()
                .setThumbnail(bot.avatarURL);

              client.guilds.cache
                .get("602906543356379156")
                .channels.cache.get("889426003368214528")
                .send({ embeds: [msg] });
              if (bot.owners) {
                for (const owner of bot.owners) {
                  client.users.cache.get(owner).send({ embeds: [msg] });
                }
              }
            }
            if (!off) {
              const msg = new Discord.MessageEmbed()
                .setTitle(`${bot.tag} is ONLINE!`)
                .setColor("#FEF40E")
                .setDescription(`${bot.username} (${bot.id}) is back Online!`)
                .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
                .setTimestamp()
                .setThumbnail(bot.avatarURL);

              client.guilds.cache
                .get("602906543356379156")
                .channels.cache.get("889426003368214528")
                .send({ embeds: [msg] });
            }
          }
        }
      });
    }
  } catch (e) {}
});
