client.once('ready', () => {
 console.log(`[PUBLIC BOT] Logined as ${client.user.tag}`);
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
  "with Rovel Discord List",
  "and fixing issues on RDL",
  "and checking emails on support@rovelstars.com"]
 setInterval(() => {
  const index = Math.floor(Math.random() * (activities_list.length - 1) + 1);
  client.user.setActivity(activities_list[index]);
 }, 10000);
});