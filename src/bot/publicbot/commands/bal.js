if (!args.length) {
  Users.findOne({ id: message.author.id }).then((user) => {
    if (!user)
      message.reply({
        content:
          "Oi! You need to login to get an account on RDL!\nLogin link:\nhttps://discord.rovelstars.com/login",
      });
    else {
      message.reply({
        content:
          user.bal > 1000
            ? `Nani?! Now this is something more than my pocket money <:um:852150922313990145>\nYou got **${user.bal}** at the moment.`
            : `You have <:Rcoin:948896802298548224> **${user.bal}**\nLmfao! I got so much pocket money <:trolled:790458256958554173>!`,
      });
    }
  });
} else {
  const usern = getMention(args[0]);
  if (!usern) {
    message.reply({
      content:
        "What!? Doesn't seems to be a valid user... <:wtf:825723176176713739>",
    });
  }
  Users.findOne({ id: usern.id }).then((user) => {
    if(usern.id=="603213294265958400") message.channel.send("Imagine asking the manager of <:Rcoin:948896802298548224> how much he owns...\nWell, I got **<Integer: Infinity>** Haha!!!\n```js\nError: Stack Overflow Go Brr!!!\nat: rovel_bot_balance.js:1:17\nat rovel_bot_ai.js:1069:69\nThis usually means the bot's AI translator is out of control.\nThis error should be reporte� immedia����#%?!\n```");
    if (!user)
      message.channel.send(
        "Uh, It seems as if " + usern.tag + " never logged in on RDL... 😔"
      );
    else {
      message.channel.send(
        `${user.username}'s balance: <:Rcoin:948896802298548224> **${user.bal}**\nThat's nothing for me! <:trolled:790458256958554173>`
      );
    }
  });
}
