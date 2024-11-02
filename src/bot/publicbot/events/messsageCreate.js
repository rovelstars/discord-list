client.on("messageCreate", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  let args = message.content.slice(prefix.length).trim().split(/ +/);
  let command = args.shift().toLowerCase();
  if (command == "" || !command) message.reply("Nani? Say it Clearly!");
  else if (command == "reload") {
    if (message.content.includes("--force")) {
      if (!client.owners.includes(message.author.id)) {
        message.reply("Baka! You're not even allowed to do so!");
      } else {
        reload();
        message.reply(
          "Huh!? When i will be a owner, i will force you then! <:um:852150922313990145>\nAnyways, Events and Commands are being reloaded!"
        );
      }
    } else {
      let cdm = searchCommand("help");
      if (!cdm) {
        message.reply("Huh? Ok, Reloading Commands and Events!");
        reload();
      } else {
        message.reply(
          "Noobie! I think the commands are already there. Use `--force` to force reload!"
        );
      }
    }
  } else {
    try {
      let cmd = searchCommand(command);
      if (!cmd) return message.reply("Oi! That Command isn't there!");
      else {
        try {
          eval(`(async()=>{${cmd.code}})();`);
        } catch (e) {
          message.reply(
            "Me go brrr!\n```\n" + e.stack.slice(0, 1880) + "...\n```"
          );
          console.warn(
            "[PUBLIC BOT] Error!\n```\n" +
              e.stack.slice(0, 1880) +
              "...\n```\nUser:\n```\n" +
              JSON.stringify(message.author) +
              "\n```"
          );
        }
      }
    } catch (e) {
      message.reply(
        `Nani?!\nI got an Error!\n\`\`\`\n${e.stack.slice(0, 1880)}...\n\`\`\``
      );
    }
  }
});
