if (message.member.permissions.has("ADMINISTRATOR")) {
  Cache.Servers.findOne({ id: message.guild.id }).then((server) => {
    if (!server) {
      message.channel.send(
        "Okay! Im adding this server on RDL! <:stonks:791163340607979561>"
      );
      /*message.channel.send("Making an invite link!").then(msg => {
    msg.channel.createInvite({ maxAge: 0, reason: `${message.author.tag} asked to add this server to RDL!` }).then(invite => {
     msg.edit(`Invite code: **${invite.code}**`);*/
      let Server = new Cache.models.servers({
        id: message.guild.id,
        owner: message.guild.ownerId,
        name: message.guild.name,
        icon: message.guild.icon,
        short: message.guild.description || "Short description is not Updated.",
      }).save((err, ser) => {
        if (err)
          message.reply({
            content:
              "Nani?! An Error Occurred!\nI cannot add your server to RDL!\n" +
              err,
          });
        message.channel.send(
          "Successfully Added your server to RDL!\nPlease update the description of your server on the dashboard on RDL."
        );
        Cache.Servers.refresh();
      });
    } else {
      message.channel.send("Oi! This server is already on RDL!");
    }
  });
} else {
  message.channel.send(
    "Nani?! You're not an administrator to run this command!"
  );
}
