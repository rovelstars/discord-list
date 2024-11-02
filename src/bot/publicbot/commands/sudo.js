if (privatebot.owners.includes(message.author.id)) {
  const mem = getMention(args[0]);
  if (!mem) {
    message.reply({ content: "Invalid User" });
  } else {
    args.shift();
    const oldowner = message.author;
    args = args.length ? `${args.join(" ")}` : `${prefix}`;
    message.content = args;
    message.author = mem;
    const msgg = new Discord.MessageEmbed()
      .setTitle("⚠️ Running SUDO! ⚠️")
      .setColor("RANDOM")
      .setDescription(
        `Message Author is now **${message.author.tag}**\nThe command asked to run as **__SUDO__** is:\n\`\`\`\n${message.content}\n\`\`\``
      )
      .setThumbnail(message.author.avatarURL())
      .setTimestamp()
      .setFooter(`Original Author: ${oldowner.tag}`);
    message.channel.send({ embeds: [msgg] });
    if (message.content.startsWith(prefix) && !message.author.bot) {
      args = message.content.slice(prefix.length).trim().split(/ +/);
      command = args.shift().toLowerCase();
      cmd = searchCommand(command);
      try {
        if (!cmd) {
          message.reply({ content: "That command Doesn't exist!" });
        } else eval((`(async()=>{${cmd.code}})()`););
      } catch (e) {
        message.reply({ content: `An Error Occured!\n\`\`\`\n${e}\n\`\`\`` });
      }
    }
  }
} else {
  message.reply({
    content: "You're not even a owner, asking for sudo perms lmao!",
  });
}
