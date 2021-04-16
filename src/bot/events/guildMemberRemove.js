client.on("guildMemberRemove", (member)=>{
 if(member.bot){
   Bots.findOne({id: member.id}).then(bot=>{
    if(!bot) return;
    if(bot.added){
     bot.added = false;
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Stopped Listing!`)
    .setColor("#FF0000")
    .setDescription(`**${bot.username}** has been removed from our server and had been stopped getting listed from now on until it's added back!`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);
    bot.save();
   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
    }
   })
 }
});