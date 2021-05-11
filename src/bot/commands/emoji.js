if(message.content.includes("--code")){
 const reactionEmoji = message.guild.emojis.cache.find(emoji => emoji.name == args[0]);
	message.channel.send("`"+reactionEmoji.toString()+"`");
}
else{
 const reactionEmoji = message.guild.emojis.cache.find(emoji => emoji.name == args[0]);
 message.channel.bulkDelete(1).then(()=>{
	message.channel.send(reactionEmoji.toString());
 });
}