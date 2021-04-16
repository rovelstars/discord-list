if (!args.length) {
 Users.findOne({ id: message.author.id }).then(user => {
  if (!user) message.reply("Please login to get an account on RDL!\nLogin link:\nhttps://discord.rovelstars.com/login");
  else {
   message.reply("You have R$ **" + user.bal + "**");
  }
 })
}
else {
 await Users.findOne({ id: args[0] }).then(user => {
  if (!user) message.channel.send("It seems as if " + args[0] + " never logined on RDL...");
  else {
   message.channel.send(`${user.username}'s balance: R$ **${user.bal}**`);
  }
 });
}