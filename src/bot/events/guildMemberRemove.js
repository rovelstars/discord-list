client.on("guildMemberRemove", (member)=>{
 
 const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome・logs');
 if(channel){
  channel.send(`R.I.P ${member.user.tag}, why did you leave bro?`);
 }
 
 if(!member.user.bot){
  Bots.find({$text:{$search: member.user.id}}).then(async bots=>{
   for(const bot of bots){
    if(bot.owners[0]==member.user.id){
     Cache.Bots.deleteOne({id: bot.id},function(err){
      fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `Bot ${bot.tag} (${bot.id}) has been deleted because the main owner (${member.user.tag})left the server.\nThe data deleted is:\n\`\`\`\n${JSON.stringify(bot)}\n\`\`\`\nIncase he left accidentally, the above data may be added back again manually if the bot is added back to RDL`,
         "title": "Bot Deleted!",
         "color": "#ff0000",
         "owners": bot.owners,
         "img": bot.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
     });
    }
    else if(bot.owners.includes(member.user.id)){
     Bots.findOne({id: bot.id}).then(d=>{
      d.added = false;
      d.save();
      fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `Bot ${bot.tag} (${bot.id}) was stopped listing because one of the secondary owners left the server. Please ask them to join back to make this bot list back again.`,
         "title": "Bot Stopped Listing!",
         "color": "#ff0000",
         "owners": bot.owners,
         "img": bot.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
     })
    }
    }});
 }
 if(member.user.bot){
   Bots.findOne({id: member.user.id}).then(bot=>{
    if(!bot) return;
    if(bot.added){
     bot.added = false;
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Stopped Listing!`)
    .setColor("#FF0000")
    .setDescription(`**${bot.tag}** has been removed from our server and had been stopped getting listed from now on until it's added back!`)
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