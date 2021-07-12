Cache.models.bots.find({added: false}).limit(5).then(async bots=>{
 let msg="> Showing the Oldest 5 Bots that are not added to this server:\n";
 for await(const bot of bots){
  await fetch(`${process.env.DOMAIN}/api/client/mainserver/${bot.id}`).then(r=>r.json()).then(async d=>{
   if(!d.condition){
    msg+= await (bot.id.startsWith("1"))?`<${bot.invite}> - ${bot.tag} [⚠️ OLD BOT, CHANGE PERMS TO 0]\n`:`<https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=0&scope=bot> - ${bot.tag}\n`
   }
  });
 }
 await message.channel.send(msg);
})