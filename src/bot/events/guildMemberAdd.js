client.on("guildMemberAdd", (member)=>{
 
 // Send the message to a designated channel on a server:
 const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome・logs');
 if(channel){
 const welcomelist = [
 `${member} just joined the server - glhf!`,
`${member} just joined. Everyone, look busy!`,
`${member} just joined. Can I get a heal?`,
`${member} joined your party.`,
`${member} joined. You must construct additional pylons.`,
`Ermagherd. ${member} is here.`,
`Welcome, ${member}. Stay awhile and listen.`,
`Welcome, ${member}. We were expecting you ( ͡° ͜ʖ ͡°)`,
`Welcome, ${member}. We hope you brought pizza.`,
`Welcome ${member}. Leave your weapons by the door.`,
`A wild ${member} appeared.`,
`Swoooosh. ${member} just landed.`,
`Brace yourselves. ${member} just joined the server.`,
`${member} just joined. Hide your bananas.`,
`${member} just arrived. Seems OP - please nerf.`,
`${member} just slid into the server.`,
`A ${member} has spawned in the server.`,
`Big ${member} showed up!`,
`Where’s ${member}? In the server!`,
`${member} hopped into the server. Kangaroo!!`,
`${member} just showed up. Hold my beer.`,
`Challenger approaching - ${member} has appeared!`,
`It's a bird! It's a plane! Nevermind, it's just ${member}.`,
`It's ${member}! Praise the sun! [T]/`,
`Never gonna give ${member} up.
Nevergonna let ${member} down.`,
`Ha! ${member} has joined! You activated my trap card!`,
`Cheers, love! ${member}'s here!`,
`Hey! Listen! ${member} has joined!`,
`We've been expecting you ${member}`,
`It's dangerous to go alone, take ${member}!`,
`${member} has joined the server! It's super effective!`,
`Cheers, love! ${member} is here!`,
`${member} is here, as the prophecy foretold.`,
`${member} has arrived. Party's over.`,
`Ready player ${member}`,
`${member} is here to kick butt and chew bubblegum. And Disco${member}ll out of gum.`,
`Hello. Is it ${member} you're looking for?`,
`${member} has joined. Stay a while and listen!`,
`Roses are red, violets are blue, ${member} joined this server with you`, ];
 const hiwelcome = Math.floor(Math.random() * (welcomelist.length - 1) + 1);
 channel.send('<a:incoming:822373222993100840> ' + welcomelist[hiwelcome]);
 }
 if(member.user.bot){
  let role = client.guilds.cache.get("602906543356379156").roles.cache.get("775763023234203720");
  member.roles.add(role).catch(e=>console.log(e));
   Bots.findOne({id: member.user.id}).then(bot=>{
    if(!bot) return;
    if(!bot.added){
     bot.added = true;
     bot.status = (member.presence.status || "online");
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Listed!`)
    .setColor("#FEF40E")
    .setDescription(`**${bot.username}** has been added to our server and it will be getting listed on RDL from now on!`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);
    bot.save();
   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send({embeds: [msg]})
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send({embeds:[msg]});
    }
   }
    }
   })
 }
 if(!member.user.bot){
  if(Cache.Bots.findOneByOwner(member.user.id)){
   let role = client.guilds.cache.get("602906543356379156").roles.cache.get("775250249040134164");
   member.roles.add(role).catch(e=>console.log(e));
  }
  
  var bots = Cache.Bots.findByOwner(member.user.id);
   for(const bot of bots){
    if(bot.added == false){
     Cache.Bots.findOne({id: bot.id}).then(d=>{
      d.added = true;
      fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `Bot ${d.username} (${d.id}) has been listed again because one of the owners - ${member.user.tag} (${member.user.id}) joined back our server.`,
         "title": "Bot Listed!",
         "color": "#FEF40E",
         "owners": bot.owners,
         "img": bot.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
     })
    }
    }
 }
});