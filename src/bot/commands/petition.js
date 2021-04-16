prompter
 .message(message.channel, {
  question: 'Write your Options!',
  userId: message.author.id,
  max: 4,
  timeout: (5 * 3600),
 })
 .then(responses => {
  if (!responses.size) {
   message.reply("You left me? Am i a __**JOKE**__ to you?");
  }
  if(responses.size>=9){
   message.reply("Max 10 choices!");
  }
  else {
   const num = ["one","two","three","four","five","six","seven","eight","nine","keycap_ten"];
   let choices = responses.map((data,index)=>{
    `:${num[index]}: ${data}`
   });
   const msg = new Discord.MessageEmbed()
   .setTitle(`Choose your choice! By ${message.author.tag} !`)
   .setColor("RANDOM")
   .setDescription(`Hosted by ${message.author.tag}!\nWould you choose:-\n${choices.join("\n")}\nReact your choice below!`)
   .setFooter(`Conducted by: ${message.author.username}`)
   .setTimestamp();
   message.channel.send("Ok.. Making a petition and posting it!");
   client.guilds.cache("602906543356379156").channels.cache.get("775231334120685570").send(msg).then(msg=>{
    for(const emoji of num){
     msg.react(`:${emoji}:`);
    }
   }).catch(e=>{
    message.reply("Failed to post petition!\n"+e);
   })
  }
 });