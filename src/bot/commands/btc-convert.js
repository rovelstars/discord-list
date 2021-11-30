var { bitcoinToFiat } = require("bitcoin-conversion");
(async () => {
  const cu = args[0];
  var to = args[1] || "USD";
  to = to.toUpperCase();
  const result = await bitcoinToFiat(cu, to);
  await message.channel.send(`> ${to}: **${result}**`);
})();
