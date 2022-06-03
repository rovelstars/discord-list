if (message.member.permissions.has("ADMINISTRATOR")) {
  Cache.Servers.findOne({ id: message.guild.id }).then((server) => {
    if (!server) {
      message.reply("Server not on RDL, add it.");
    } else {
      args = args.join(" ");
      var err;
      if (args.length < 200) err = "invalid_desc";
      if (!err) {
        server.desc = coronaSanitizer(args, {
          allowedTags: coronaSanitizer.defaults.allowedTags.concat([
            "discord-message",
            "discord-messages",
            "img",
            "iframe",
            "style",
            "h1",
            "h2",
            "link",
            "mark",
            "svg",
            "span",
          ]),
          allowVulnerableTags: true,
          allowedAttributes: {
            "*": ["*"],
          },
        });
        server.save();
        message.reply("Updated!");
      } else {
        message.reply(err);
      }
    }
  });
} else {
  message.reply("Get rekt cause you're not admin.");
}
