if (!args.length) {
 Users.findOne({ id: message.author.id }).then(user => {
  if (!user) message.reply("Oi! You need to login to get an account on RDL!\nLogin link:\nhttps://discord.rovelstars.com/login");
  else {
   message.reply((user.bal>1000)?`Nani?! Now this is something more than my pocket money <:um:852150922313990145>\nYou got **${user.bal}** at the moment.`:`You have R$ **${user.bal}**\nLmfao! I got so much pocket money <:trolled:790458256958554173>!`);
  }
 })
}
else {
 const usern = getMention(args[0]);
 if(!usern) {
  message.reply("What!? Doesn't seems to be a valid user... <:wtf:825723176176713739>");
 }
 Users.findOne({ id: usern.id }).then(user => {
  if (!user) message.channel.send("Uh, It seems as if " + usern.tag + " never logined on RDL... 😔");
  else {
   message.channel.send(`${user.username}'s balance: R$ **${user.bal}**\nThat's nothing for me! <:trolled:790458256958554173>`);
  }
 });
}