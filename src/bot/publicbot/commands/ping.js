message.reply({ content: "Pong!" }).then((msg) => {
  setTimeout(() => {
    msg.edit({
      content:
        "Don't say Progamer 😎 is noob, nobody uses ping irl. <:sad:799907452573057075>",
    });
  }, 3000);
});
