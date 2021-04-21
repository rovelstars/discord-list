if(cooldownearn.has(message.author.id)){
  message.reply("Come after a minute!");
}
else {
  Users.findOne({id: message.author.id}).then(user=>{
    if(!user) message.reply("Please login to RDL to make an account in order to recieve money!\nLogin link:\nhttps://discord.rovelstars.com/login");
    else {
      user.bal+=1;
      user.save();
      message.channel.send("You recieved R$ 1!");
      cooldownearn.add(message.author.id);
  setTimeout(()=>{
    cooldownearn.delete(message.author.id);
  }, 3600*1000);
    }
  })
}