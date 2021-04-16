client.on("guildMemberAdd", (member)=>{
 if(member.bot){
   Bots.findOne({id: member.id}).then(bot=>{
    if(!bot) return;
    if(!bot.added){
     bot.added = true;
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Listed!`)
    .setColor("#FEF40E")
    .setDescription(`**${bot.username}** has been added to our server and it will be getting listed on RDL from now on!`)
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