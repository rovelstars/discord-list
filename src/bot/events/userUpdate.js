client.on('userUpdate', (olduser, newuser) => {
 if (newuser.bot) {
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
 else if(!newuser.bot){
  Users.findOne({ id: newuser.id }).then(user => {
  if (!user){
  }
  else {
  fetch("https://discord.rovelstars.com/api/client/users/" + user.id).then(r => r.json()).then(u => {
    if ((u.avatar === user.avatar) && (u.username === user.username) && (u.discriminator === user.discriminator)){
    }
    else {
     if (u.avatar !== user.avatar) {
      user.avatar = u.avatar;
     }
     if (u.username !== user.username) {
      user.username = u.username;
     }
     if (u.discriminator !== user.discriminator) {
      user.discriminator = u.discriminator;
     }
     user.save();
     fetch("https://discord.rovelstars.com/api/client/log", {
      method: "POST",
      headers: {
       "Content-Type": "application/json"
      },
      body: JSON.stringify({
       "secret": process.env.SECRET,
       "img": u.avatarURL,
       "desc": `New Data Saved:\n\`\`\`json\n${JSON.stringify(user)}\n\`\`\``,
       "title": ` User ${u.tag} Data Updated!`,
       "color": "#faa61a",
       "url": `https://discord.rovelstars.com/users/${u.id}`
      })
     });
    }
   });
  }
  });
};
});