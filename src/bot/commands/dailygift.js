if(cooldown.daily.has(message.author.id)){
  message.reply("Visit again tomorrow! Today's daily gift has been redeemed by you! You will be DMed when you can redeem your daily gift again!");
}
else {
  Users.findOne({id: message.author.id}).then(user=>{
    if(!user) message.reply("Please login to RDL to make an account in order to recieve gifts!\nLogin link:\nhttps://discord.rovelstars.com/login");
    else {
      user.bal+=10;
      user.save();
      message.channel.send("You recieved R$ 10!");
      cooldown.daily.add(message.author.id);
  setTimeout(()=>{
    cooldown.daily.delete(message.author.id);
    client.users.cache.get(message.author.id).send("Claim your daily gift again!");
  }, 86400000);
    }
  })
}