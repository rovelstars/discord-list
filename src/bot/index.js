const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
client.login(process.env.TOKEN);
const {owners} = require("../data.js");
client.commands = new Discord.Collection();
client.owners = owners;
const prefix = process.env.PREFIX;
const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));
let i = 0;
let j = commandFiles.length;
for (const file of commandFiles) {
 const command = require(`./commands/${file}`);
 i += 1;
 console.log(`[BOT] Loaded - ${file} (${i}/${j})`)
 client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

client.once('ready', () => {
 console.log(`[BOT] Logined as ${client.user.tag}`);

});

client.on('message', message => {
 //start of fun
 if (message.author.bot) return;
 if (message.content == ".")
  message.channel.send("...");
 if (message.content.includes("pro gamer move"))
  message.channel.send("(⌐■-■)");
 if (message.content.includes("<@!602902050677981224>") || message.content.includes("<@602902050677981224>"))
  message.channel.send("Don't ping him, he reads every message of this server...");
 if (message.content.includes("good night"))
  message.reply("Sleep tight 😴");
 if (message.content.includes("RDL"))
  message.channel.send("RDL is the best Discord Listing Service by Rovel, and you can add bots, servers, or yourself!\nMake sure to come here if you want your bots, servers, and yourself to be discoverable and popular! (⌐■-■)");
 //end of fun
 if (!message.content.startsWith(prefix)) return;

 const args = message.content.slice(prefix.length).trim().split(/ +/);
 const commandName = args.shift().toLowerCase();

 const command = client.commands.get(commandName) ||
  client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

 if (!command) return;

 if (command.guildOnly && message.channel.type === 'dm') {
  return message.reply('I can\'t execute that command inside DMs!');
 }

 if (command.permissions) {
  const authorPerms = message.channel.permissionsFor(message.author);
  if (!authorPerms || !authorPerms.has(command.permissions)) {
   return message.reply('You can not do this!');
  }
 }

 if (command.args && !args.length) {
  let reply = `You didn't provide any arguments, ${message.author}!`;

  if (command.usage) {
   reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
  }

  return message.channel.send(reply);
 }

 if (!cooldowns.has(command.name)) {
  cooldowns.set(command.name, new Discord.Collection());
 }

 const now = Date.now();
 const timestamps = cooldowns.get(command.name);
 const cooldownAmount = (command.cooldown || 0) * 1000;

 if (timestamps.has(message.author.id)) {
  const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

  if (now < expirationTime) {
   const timeLeft = (expirationTime - now) / 1000;
   return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
  }
 }

 timestamps.set(message.author.id, now);
 setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
 try {
  command.execute(message, args);
 } catch (error) {
  console.error(error);
  message.reply('There was an error trying to execute that command! ☹️\nPlease tell the devs about it. Moreover, I have sent a detailed log to them already. 📨\n' + `If you can send this log to them, it would be great!\n\`\`\`\n${error}\n\`\`\``);
 }
});

let router = require("express").Router();
router.get("/", (req, res) => {
 res.send("hmm");
});
router.get("/id", (req, res) => {
 res.json({ id: client.user.id });
});
router.get("/owners", (req, res) => {
 res.json({owners: client.owners});
});
router.get("/owner/:id", (req, res)=>{
 if(req.params.id){
  var condition = client.owners.includes(req.params.id);
  res.json({condition});
 }
 else res.json({error: "id_not_sent"});
})
module.exports = router;