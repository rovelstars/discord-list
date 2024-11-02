client.on("messageReactionAdd", function (reaction, user) {
  try {
    if (reaction.message.channel.id == "889429029898321921") {
      const id = reaction.message.content.replace("<@!", "").replace(">", "");
      if (id === user.id) {
        reaction.message.delete();
      }
    }
  } catch (e) {}
});
