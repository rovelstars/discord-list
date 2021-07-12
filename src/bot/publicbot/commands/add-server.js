if (message.member.hasPermission("ADMINISTRATOR")) {
 Servers.findOne({ id: message.guild.id }).then(server => {
  if (!server) {
   message.channel.send("Kantan sugiru! Im posting this server on RDL!");
   /*message.channel.send("Making an invite link!").then(msg => {
    msg.channel.createInvite({ maxAge: 0, reason: `${message.author.tag} asked to add this server to RDL!` }).then(invite => {
     msg.edit(`Invite code: **${invite.code}**`);*/
     let Server = new Servers({
      id: message.guild.id,
      owner: message.guild.ownerID,
      name: message.guild.name,
      icon: message.guild.icon||`https://ui-avatars.com/api/?name=${message.guild.name.replaceAll(" ","+")}&bold=true&color=ffffff&format=svg&background=5865f2`,
      short: (message.guild.description|| "Short description is not Updated.")
     }).save((err, ser) => {
      if (err) message.reply("Nani?! An Error Occurred!\nI cannot add your server to RDL!\n" + err);
      message.channel.send("Successfully Added your server to RDL!\nPlease update the description of your server on the dashboard on RDL.");
     })
  }
  else {
   message.channel.send("Baka! This server is already on RDL!");
  }
 });
}
else {
 message.channel.send("Nani?! You're not an administrator to run this command!");
}