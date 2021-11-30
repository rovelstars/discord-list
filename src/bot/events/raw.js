//By reading this, you agree that you are an idiot, because its copied from idiot's guide lmfao
//anyways i edited it to make it work better.
client.on("raw", (packet) => {
  // We don't want this to run on unrelated packets
  if (["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"].includes(packet.t)) {
    // Grab the channel to check the message from
    const channel = client.channels.cache.get(packet.d.channel_id);
    // There's no need to emit if the message is cached, because the event will fire anyway for that
    if (!channel.messages.cache.has(packet.d.message_id)) {
      // Since we have confirmed the message is not cached, let's fetch it
      channel.messages.fetch(packet.d.message_id).then((message) => {
        // Emojis can have identifiers of name:id format, so we have to account for that case as well
        const emoji = packet.d.emoji.id
          ? `${packet.d.emoji.name}:${packet.d.emoji.id}`
          : packet.d.emoji.name;
        // This gives us the reaction we need to emit the event properly, in top of the message object
        const reaction = message.reactions.cache.get(emoji);
        // Adds the currently reacting user to the reaction's users collection.
        if (reaction)
          reaction.users.cache.set(
            packet.d.user_id,
            client.users.cache.get(packet.d.user_id)
          );
        var user = client.users.cache.get(packet.d.user_id);
        if (user == null) {
          client.users.fetch(packet.d.user_id).then((d) => {
            if (d.avatar == null) d.avatar = d.discriminator % 5;
            user = d;
          });
        } else {
          if (user.avatar == null)
            user.avatar = (user.discriminator % 5).toString();
        }
        // Check which type of event it is before emitting
        if (packet.t === "MESSAGE_REACTION_ADD") {
          client.emit("messageReactionAdd", reaction, user);
        }
        if (packet.t === "MESSAGE_REACTION_REMOVE") {
          client.emit("messageReactionRemove", reaction, user);
        }
      });
    }
  }
});
