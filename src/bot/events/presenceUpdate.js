client.on("presenceUpdate", (old, neww)=>{
 try{
  if(!old.bot || !neww.bot){
   client.users.cache.get(old.id || neww.id).send("hey im just testing.").catch(e=>{});
  }
 if(old.bot){
  var off=false;
  Bots.findOne({id: old.id}).then(bot=>{
   if(!bot) return;
   if(bot.status!==neww.presence.status){
    if(neww.presence.status=="offline") off=true;
    bot.status=neww.presence.status;
    bot.save();
    if(off){
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
    if(!off){
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
  })
 }
 } catch(e){
 }
});