if(cooldownearn.has(message.author.id)){
  message.reply("Oi! Come after a minute!");
}
else {
  Users.findOne({id: message.author.id}).then(user=>{
    if(!user) message.reply("Nani?! You're not logined!\nPlease login to RDL to make an account in order to recieve money!\nLogin link:\nhttps://discord.rovelstars.com/login");
    else {
     let act = false;
     if(privatebot.isInMain(message.author.id)){
     act = privatebot.users.cache.get(message.author.id).presence.activities.filter(e=>{return (e.type=="CUSTOM_STATUS" && (e.state.includes("dscrdly.com") || e.state.includes("discord.rovelstars.com")))});
     if(act.length==0) act=false;
     else act=true;
     }
     const c = Math.floor(Math.random()*10)+1;
      user.bal+=c;
      if(act) user.bal+=10;
      user.save();
      message.channel.send(`Lol?! You recieved R$ ${c} ${(act)?"and R$ 10 as a bonus for **link in status** ♥️":""}!\nThat's nothing compared to me- <:trolled:790458256958554173>`);
      cooldownearn.add(message.author.id);
  setTimeout(()=>{
    cooldownearn.delete(message.author.id);
  }, 60000);
    }
  })
}