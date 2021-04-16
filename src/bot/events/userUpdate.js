client.on('userUpdate', (olduser, newuser) => {
 if (olduser.bot) {
  try {
   var num;
   Bots.findOne({ id: olduser.id }).then(bot => {
    if(!bot) return;
    if(bot.username!=newuser.username){
     bot.username = newuser.username;
     num="Username Updated!\n";
    }
    if(bot.avatar!=newuser.avatar){
      bot.avatar = newuser.avatar;
      num="Avatar Updated!\n";
    }
    if(bot.discriminator!=newuser.discriminator){
     bot.discriminator = newuser.discriminator;
     num="Discriminator Updated!\n"
    }
    const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag}'s Data is Updated!`)
    .setColor("RANDOM")
    .setDescription(`${num}Please look into it if you didn't change anything on your end, but happened on our end.`)
    .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);

   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
   bot.save();
   })
  }
  catch {}
 }
});