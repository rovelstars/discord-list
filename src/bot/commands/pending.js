Bots.find({added: false}).limit(5).then(bots=>{
 let msg="Showing the Oldest 5 Bots that are not added to this server:\n";
 for(const bot of bots){
  fetch(`${process.env.DOMAIN}/api/client/mainserver/${bot.id}`).then(r=>r.json()).then(d=>{
   if(!d.condition){
    msg+=`${bot.invite} - ${bot.tag}\n`
   }
   message.channel.send(msg);
  });
 }
})