if(client.owners.includes(message.author.id)){
 prompter
 .message(message.channel, {
  question: 'Write your Announcement!',
  userId: message.author.id,
  max: 1,
  timeout: (3*3600*1000),
 })
 .then(responses => {
  if (!responses.size) {
   message.reply("You left me? Am i a __**JOKE**__ to you?");
  }
  else{
   const pinged = args.includes("--everyone");
   const isrdl = args.includes("--rdl-related");
   const announcement = responses.first();
   if(announcement=="cancel"){
    message.reply("🙅 Cancelled Making Announcement!");
   }
   else{
   const msg = new Discord.MessageEmbed()
   .setTitle("New Announcement!")
   .setColor("RANDOM")
   .setDescription(announcement)
   .setFooter(`Posted by ${message.author.tag}`)
   .setTimestamp();
   if(!isrdl && pinged){
    client.guilds.cache.get("602906543356379156").channels.cache.get("775245886795808768").send(msg);
    client.guilds.cache.get("602906543356379156").channels.cache.get("775245886795808768").send("@everyone ^");
   }
   else if(!isrdl && !pinged){
    client.guilds.cache.get("602906543356379156").channels.cache.get("775245886795808768").send(msg);
   }
   else if(isrdl && pinged){
    client.guilds.cache.get("602906543356379156").channels.cache.get("830791693904904212").send(msg);
    client.guilds.cache.get("602906543356379156").channels.cache.get("830791693904904212").send("@everyone ^");
   }
   else {
    client.guilds.cache.get("602906543356379156").channels.cache.get("830791693904904212").send(msg);
   }
   message.channel.bulkDelete(2).then(()=>{
    message.channel.send("<:good:783358064089759744> Posted the Announcement successfully!").then(msg=>{
     setTimeout(()=>{
      msg.delete();
     }, 10000);
    })
   })
  }}
 });
}
else{
 message.channel.send("Aren't you a simple guy living on discord?");
}