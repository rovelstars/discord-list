if (message.content.includes("--code")) {
  const e = message.guild.emojis.cache.find((emoji) => emoji.name == args[0]);
  if (e) {
    message.channel.send("`" + e.toString() + "`");
  }
} else {
  const e = message.guild.emojis.cache.find((emoji) => emoji.name == args[0]);
  if (e) {
    message.channel.bulkDelete(1).then(() => {
      message.channel.send(e.toString());
    });
  }
}
