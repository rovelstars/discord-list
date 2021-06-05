client.on('userUpdate', (olduser, newuser) => {
 if (newuser.bot) {
  try {
   var num;
   Bots.findOne({ id: newuser.id }).then(bot => {
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
   fetch("https://discord.rovelstars.com/api/client/log",{
    method: "POST",
      headers: {
       "Content-Type": "application/json"
      },
      body: JSON.stringify({
       "secret": process.env.SECRET,
       "img": bot.avatarURL,
       "desc": `${num}Please look into it if you didn't change anything on your end, but happened on our end.`,
       "title": `Bot ${bot.tag} Data Updated!`,
       "color": "#FEE75C",
       "owners": bot.owners,
       "url": `https://discord.rovelstars.com/bots/${bot.id}`
      })
   })
   bot.save();
   })
  }
  catch (e){}
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
     var num;
     if (u.avatar !== user.avatar) {
      user.avatar = u.avatar;
      num="Avatar Updated!\n";
     }
     if (u.username !== user.username) {
      user.username = u.username;
      num="Username Updated!\n";
     }
     if (u.discriminator !== user.discriminator) {
      user.discriminator = u.discriminator;
      num="Discriminator Updated!\n";
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
       "desc": num,
       "title": ` User ${u.tag} Data Updated!`,
       "color": "#FEE75C",
       "url": `https://discord.rovelstars.com/users/${u.id}`
      })
     });
    }
   });
  }
  });
};
});