client.on("guildMemberAdd", (member)=>{
 if(member.bot){
  let role = client.guilds.cache.get("602906543356379156").roles.cache.get("775763023234203720");
  client.guilds.cache.get("602906543356379156").members.cache.get(member.id).roles.add(role).catch(console.error);
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
 if(!member.bot){
  Bots.find({$text:{$search: member.id}}).then(async bots=>{
   for(const bot of bots){
    if((bot.owners.includes(member.id)) && (bot.added == false)){
     Bots.findOne({id: bot.id}).then(d=>{
      d.added = true;
      fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `Bot ${d.username} (${d.id}) has been listed again because one of the owners - ${member.tag} (${member.id}) joined back our server.`,
         "title": "Bot Listed!",
         "color": "#FEF40E",
         "owners": bot.owners,
         "img": bot.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
     })
    }
    }});
 }
});