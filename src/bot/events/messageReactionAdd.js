client.on("messageReactionAdd", function(reaction, user) {
 if(reaction.message!==undefined){
 if (reaction.message.channel.id == "858200098612838430") {
  const id = reaction.message.content.replace("<@!","").replace(">","");
  if(id===user.id){
   reaction.message.delete();
  }
 }
 }
});