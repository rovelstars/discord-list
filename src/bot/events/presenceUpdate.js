client.on('presenceUpdate', (olduser, newuser) => {
 try {
  const status = {
   old: olduser ? olduser.status : "offline",
   new: newuser.status
  };
  if (status.old !== status.new) {
   Bots.findOne({ id: olduser.userID }).then(bot => {
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

       client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
       if (bot.owners) {
        for (const owner of bot.owners) {
         client.users.cache.get(owner).send(msg);
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

       client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
       if (bot.owners) {
        for (const owner of bot.owners) {
         client.users.cache.get(owner).send(msg);
        }
       }
      }
     }
    }
   })
  }
 }
 catch (e) {
  DiscordLog({ title: "Presence Error", desc: `\`\`\`js\n${e}\n\`\`\`\nID: ${newuser.userID}`, color: "#FF0000" });
 }
});