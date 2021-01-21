const {client, rovel} = require("./index.js");
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