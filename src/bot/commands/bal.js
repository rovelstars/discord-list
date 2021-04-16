if (!args.length) {
 Users.findOne({ id: message.author.id }).then(user => {
  if (!user) message.reply("Please login to get an account on RDL!\nLogin link:\nhttps://discord.rovelstars.com/login");
  else {
   message.reply("You have R$ **" + user.bal + "**");
  }
 })
}
else {
 const usern = getMention(args[0]);
 if(!usern) {
  message.reply("Doesn't seems to be a valid user... <:wtf:825723176176713739>");
 }
 Users.findOne({ id: usern.id }).then(user => {
  if (!user) message.channel.send("It seems as if " + usern.tag + " never logined on RDL...");
  else {
   message.channel.send(`${user.username}'s balance: R$ **${user.bal}**`);
  }
 });
}