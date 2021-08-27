const Discord = require("discord.js");
const fs = require("fs");
const normalText = require("diacritics").remove;
var client = new Discord.Client({
  intents: [new Discord.Intents(32509)],
});
client.login(process.env.PUBLIC_TOKEN);
globalThis.publicbot = client;
const { fetch } = require("rovel.js");
const { owners, emojiapprovers, mods, contributors } = require("../../data.js");
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
client.commands = [];
const prefix = process.env.PUBLIC_PREFIX || "a!";
var cooldownearn = new Set();
client.cooldownearn = cooldownearn;

function getMention(mention) {
  if (!mention) return;
  if (mention.startsWith("<@") && mention.endsWith(">")) {
    mention = mention.slice(2, -1);
    if (mention.startsWith("!")) {
      mention = mention.slice(1);
    }
  }
  return privatebot.users.cache.get(mention); //main bot doesnt cache anything sed...
}
function searchCommand(name) {
  for (var i = 0; i < client.commands.length; i++) {
    if (client.commands[i].name == name) return client.commands[i];
  }
}

function reload() {
  delete client.commands;
  client.commands = [];
  var commandFiles = fs
    .readdirSync(__dirname + "/commands")
    .filter((file) => file.endsWith(".js"));
  let ci = 0;
  let cj = commandFiles.length;
  for (var file of commandFiles) {
    const command = fs.readFileSync(`${__dirname}/commands/${file}`, {
      encoding: "utf8",
      flag: "r",
    });
    ci += 1;
    console.log(`[PUBLIC BOT] Command Loaded - ${file} (${ci}/${cj})`);
    file = file.replace(".js", "");
    const desc = fs.readFileSync(`${__dirname}/desc/${file}.md`, {
      encoding: "utf8",
      flag: "r",
    });
    client.commands.push({ name: file, code: command, desc });
  }
}
reload();
var eventFiles = fs
  .readdirSync(__dirname + "/events")
  .filter((file) => file.endsWith(".js"));
let ei = 0;
let ej = eventFiles.length;
for (var file of eventFiles) {
  const event = fs.readFileSync(`${__dirname}/events/${file}`, {
    encoding: "utf8",
    flag: "r",
  });
  ei += 1;
  console.log(`[PUBLIC BOT] Event Loaded - ${file} (${ei}/${ej})`);
  try {
    eval(event);
  } catch (e) {
    console.warn(
      "[PUBLIC BOT] Event Error!\n```\n" + e.stack.slice(0, 1880) + "...\n```\n"
    );
  }
}
function DiscordLog({ title, desc, color }) {
  const msg = new Discord.MessageEmbed()
    .setTitle(title)
    .setColor(color || "#5865F2")
    .setDescription(desc)
    .setURL("https://discord.rovelstars.com")
    .setTimestamp()
    .setThumbnail("https://discord.rovelstars.com/favicon.ico");

  client.guilds.cache
    .get("602906543356379156")
    .channels.cache.get("775231877433917440")
    .send({ embeds: [msg] });
}
