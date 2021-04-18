client.once('ready', () => {
 console.log(`[BOT] Logined as ${client.user.tag}`);
 setTimeout(() => {
  client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(`>>> Rovel Discord List has Started!\nWith ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
 }, 2000);
 activities_list = [
  "with all the bots on RDL",
  "with the members on RDL",
  "on discord.rovelstars.com",
  "and Coding!",
  "and Checking all Bots are fine or not",
  "Never gonna let you down!",
  "on https://discord.gg/953XCpHbKF",
  "and defeating top.gg!",
  "and wondering what's next?",
  "Among Us",
  "Minecraft",
  "Discord",
  "Rovel Discord List",
  "and fixing issues on RDL",
  "and checking emails on support@rovelstars.com"]
 setInterval(() => {
  const index = Math.floor(Math.random() * (activities_list.length - 1) + 1);
  client.user.setActivity(activities_list[index] + ' | searching for hmm! in ' + client.guilds.cache.array().length + ' servers');
 }, 10000);
});