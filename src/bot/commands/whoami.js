const msg = new Discord.MessageEmbed()
.setTitle("Info")
.setDescription(`**Username:** \`${member.author.username}\`\n**Discriminator:** \`${message.author.discriminator}\`\n**ID:** \`${message.author.id}\``)
.setColor("RANDOM")
.setImage(message.author.avatarURL())
.setTimestamp();
message.channel.send(msg);