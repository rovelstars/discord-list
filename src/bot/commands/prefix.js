if(!args.length){
 message.reply("Ping a bot or send it's ID too...");
}
else {
const user = getMention(args[0]);
if(!user){
 message.reply("That doesn't seems to be a valid bot...");
}
else {
 if(!user.bot){
  message.reply("It's not a bot, it's a **__USER__**!");
 }
 else {
  Bots.findOne({id: user.id}).then(bot=>{
   if(!bot){
    message.reply("Sorry but the bot isn't added to RDL.\nIf you're the owner of bot, please add it to RDL 🙏");
   }
   else {
    message.reply(`**${bot.username}**'s prefix: \`${bot.prefix}\``);
   }
  })
 }
}
}