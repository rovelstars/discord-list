const {rovel} = require("./index.js");
let Discord = require("discord.js");
let client = new Discord.Client();
 
 client.once("ready", () => {
  console.log("[BOT] online"+` as ${client.user.tag}`);
  client.user.setPresence({ activity: { name: 'Watching RDL' }, status: 'idle' });
 });
 
client.on("message", message => {
 if(!message.author.bot && !message.content.startsWith("."))
 return;
 
 if(message.content == ".")
 message.channel.send("...");
 if(message.content.includes("pro gamer move"))
 message.channel.send("(⌐■-■)");
 if(message.content.includes("<@!602902050677981224>") || message.content.includes("<@602902050677981224>"))
 message.channel.send("Don't ping him, he reads every message of this server...");
});

client.login(process.env.TOKEN);