if (!args[0]) {
  const msg = new Discord.MessageEmbed()
    .setTitle("RDL - Help")
    .setColor("RANDOM")
    .setDescription(
      "Here are the commands:\n" +
        client.commands
          .map((obj) => "**" + obj.name + "**: " + obj.desc)
          .join("\n")
    )
    .setTimestamp();
  message.reply({ embeds: [msg] });
} else {
  const cmd = searchCommand(args[0]);
  if (!cmd)
    message.reply({
      content: "That Command Never **Existed** in the whole World! 😑",
    });
  else message.reply({ content: "**Description**\n" + cmd.desc });
}
