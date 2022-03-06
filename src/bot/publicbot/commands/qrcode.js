if (!args.length) {
  message.reply({
    content: `Usage: \`${process.env.PUBLIC_PREFIX}qrcode <your text to for creating qrcode\``,
  });
} else {
  qr = args.join("%20");
  let link =
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + qr;
  let qrembed = new Discord.MessageEmbed()
    .setColor("RANDOM")
    .setImage(link)
    .setFooter(`Requested by ${message.author.tag}`);
  message.channel.send({ embeds: [qrembed] });
}
