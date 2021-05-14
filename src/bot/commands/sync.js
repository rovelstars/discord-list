let guy = getMention(args[0]);
if(!guy){
 message.reply("Invalid member!");
}
else{
 if(message.content.includes("--user")){
  Users.findOne({ id: guy.id }).then(user => {
  if (!user){
   message.reply("User Not Logined on RDL!");
  }
  else {
   fetch("https://discord.rovelstars.com/api/client/users/" + user.id).then(r => r.json()).then(u => {
    if ((u.avatar === user.avatar) && (u.username === user.username) && (u.discriminator === user.discriminator)){
     message.reply("Data is already up to date.");
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
       "color": "#FEE75C",
       "url": `https://discord.rovelstars.com/users/${u.id}`
      })
     });
     message.reply("Synced Successfully!");
    }
   });
  }
 });
 }
 if(message.content.includes("--bot")){
  Bots.findOne({ id: guy.id }).then(user => {
  if (!user){
   message.reply("Bot not added to RDL");
  }
  else {
   fetch("https://discord.rovelstars.com/api/client/users/" + user.id).then(r => r.json()).then(u => {
    if ((u.avatar === user.avatar) && (u.username === user.username) && (u.discriminator === user.discriminator)) return res.json({ err: "same_data" });
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
       "title": `Bot ${u.tag} Data Updated!`,
       "color": "#FEE75C",
       "url": `https://discord.rovelstars.com/bots/${u.id}`
      })
     });
     message.reply("Synced Successfully!");
    }
   });
  }
 });
 }
}