if (
  !client.owners.some((x) => x === message.author.id) ||
  !client.mods.some((x) => x === message.author.id)
) {
  message.channel.send("you are denied to use this function.");
} else {
  if (!args.length) {
    message.reply({ content: "Please provide user ID or ping him." });
  } else {
    let usern = getMention(args[0]);
    if (!usern) message.reply({ content: "Please provide a valid user!" });
    else {
      if (usern.username !== normalText(usern.username)) {
        message.guild.members.cache
          .get(usern.id)
          .setNickname(normalText(usern.username));
        message.reply({
          content:
            "Successfully updated " +
            usern.username +
            "'s nickname to " +
            normalText(usern.username),
        });
      } else {
        prompter
          .message(message.channel, {
            question:
              "Uh Oh! I couldn't suggest for proper nickname or his username is normal. If you know what should be his proper nickname, please write it below within a minute.",
            userId: message.author.id,
            max: 1,
            timeout: 3600 * 1000,
          })
          .then((responses) => {
            if (!responses.size) {
              message.reply(
                "Time's up! I won't change his nickname anymore unless you ask me again to."
              );
            } else {
              const msg = responses.first();
              message.guild.members.cache.get(usern.id).setNickname(msg);
              message.reply(
                "Successfully updated " +
                  usern.username +
                  "'s nickname to " +
                  msg
              );
            }
          });
      }
    }
  }
}
