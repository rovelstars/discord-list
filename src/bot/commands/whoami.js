const msg = new Discord.MessageEmbed()
  .setTitle("Info")
  .setDescription(
    `**Username:** \`${message.author.username}\`\n**Discriminator:** \`${message.author.discriminator}\`\n**ID:** \`${message.author.id}\``
  )
  .setColor("RANDOM")
  .setThumbnail(message.author.avatarURL())
  .setTimestamp();
message.channel.send({ embeds: [msg] });
