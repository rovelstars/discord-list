const fs = require('fs');
const Discord = require('discord.js');
var Bots = require("@models/bots.js");
const client = new Discord.Client();
client.login(process.env.TOKEN);
const { fetch } = require("rovel.js");
const { owners, emojiapprovers, mods, contributors } = require("../data.js");
client.commands = new Discord.Collection();
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
const prefix = process.env.PREFIX;

function getMention(mention) {
 if (!mention) return;

 if (mention.startsWith('<@') && mention.endsWith('>')) {
  mention = mention.slice(2, -1);

  if (mention.startsWith('!')) {
   mention = mention.slice(1);
  }

  return client.users.cache.get(mention);
 }
}
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
 client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(`>>> Rovel Discord List has Started!\nWith ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`)
});

client.on("guildMemberRemove", (member)=>{
 if(member.bot){
   Bots.findOne({id: member.id}).then(bot=>{
    if(!bot) return;
    if(bot.added){
     bot.added = false;
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Stopped Listing!`)
    .setColor("#FF0000")
    .setDescription(`**${bot.username}** has been removed from our server and had been stopped getting listed from now on until it's added back!`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);
    bot.save();
   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
    }
   })
 }
});

client.on("guildMemberAdd", (member)=>{
 if(member.bot){
   Bots.findOne({id: member.id}).then(bot=>{
    if(!bot) return;
    if(!bot.added){
     bot.added = true;
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} Listed!`)
    .setColor("#FEF40E")
    .setDescription(`**${bot.username}** has been added to our server and it will be getting listed on RDL from now on!`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);
    bot.save();
   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
    }
   })
 }
});

client.on("presenceUpdate", (old, neww)=>{
 try{
 if(old.bot){
  var off=false;
  Bots.findOne({id: old.id}).then(bot=>{
   if(!bot) return;
   if(bot.status!==neww.presence.status){
    if(neww.presence.status=="offline") off=true;
    bot.status=neww.presence.status;
    bot.save();
    if(off){
    const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} is OFFLINE`)
    .setColor("#36393f")
    .setDescription(`${bot.username} (${bot.id}) is Offline!`)
    .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);

   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
   }
    if(!off){
     const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag} is ONLINE!`)
    .setColor("#FEF40E")
    .setDescription(`${bot.username} (${bot.id}) is back Online!`)
    .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);

   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
    }
   }
  })
 }
 } catch(e){
 }
});

client.on('userUpdate', (olduser, newuser) => {
 if (olduser.bot) {
  try {
   var num;
   Bots.findOne({ id: olduser.id }).then(bot => {
    if(!bot) return;
    if(bot.username!=newuser.username){
     bot.username = newuser.username;
     num="Username Updated!\n";
    }
    if(bot.avatar!=newuser.avatar){
      bot.avatar = newuser.avatar;
      num="Avatar Updated!\n";
    }
    if(bot.discriminator!=newuser.discriminator){
     bot.discriminator = newuser.discriminator;
     num="Discriminator Updated!\n"
    }
    const msg = new Discord.MessageEmbed()
    .setTitle(`${bot.tag}'s Data is Updated!`)
    .setColor("RANDOM")
    .setDescription(`${num}Please look into it if you didn't change anything on your end, but happened on our end.`)
    .setURL(`${process.env.DOMAIN}/bots/${bot.id}`)
    .setTimestamp()
    .setThumbnail(bot.avatarURL);

   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
   if (bot.owners) {
    for (const owner of bot.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
   bot.save();
   })
  }
  catch {}
 }
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
  command.execute(message, args, fetch, client, getMention);
 } catch (error) {
  console.error(error);
  message.reply('There was an error trying to execute that command! ☹️\nPlease tell the devs about it. Moreover, I have sent a detailed log to them already. 📨\n' + `If you can send this log to them, it would be great!\n\`\`\`\n${error}\n\`\`\``);
 }
});
client.on("guildMemberAdd", user => {
 if (user.bot) {
  fetch(`${process.env.DOMAIN}/api/bots/${user.id}`).then(r => r.json()).then(bot => {
   if (bot) { //check if bot is there in db
    fetch(`${process.env.DOMAIN}/api/bots/${bot.id}/added?secret=${process.env.SECRET}`); //list the bot in rdl from now on
   }
  });
 }
});
let router = require("express").Router();
router.use(require("express").json());
router.get("/", (req, res) => {
 res.send("hmm");
});
router.get("/id", (req, res) => {
 res.json({ id: client.user.id });
});
router.get("/mainserver/members/:id", (req, res) => {
 let user;
 try {
  user = client.guilds.cache.get("602906543356379156").members.cache.get(req.params.id).user;
 } catch {
  user = null;
 }
 const condition = (user) ? true : false;
 res.json({ condition });
});
router.get("/bannedusers", (req, res) => {
 client.guilds.cache.get("602906543356379156").fetchBans().then(list => {
  res.json(list);
 })
});

router.get("/bannedusers/:id", (req, res) => {
 client.guilds.cache.get("602906543356379156").fetchBans().then(list => {
  let ban = list.map(user => user.user.id);
  if (ban.includes(req.params.id)) res.json({ banned: true });
  else res.json({ banned: false });
 })
});

router.get("/users/:id", (req, res) => {
 var user = client.users.cache.get(req.params.id);
 if (user == null) {
  fetch(`https://discord.com/api/v7/users/${req.params.id}`, {
   method: "GET",
   headers: {
    "Authorization": `Bot ${process.env.TOKEN}`
   }
  }).then(r => r.json()).then(d => res.json(d));
 }
 else res.json(user);
});
router.get("/owners", (req, res) => {
 res.json({ owners: client.owners });
});
router.get("/owner/:id", (req, res) => {
 if (req.params.id) {
  var condition = client.owners.includes(req.params.id);
  res.json({ condition });
 }
 else res.json({ error: "id_not_sent" });
});
router.get("/emojiapprovers", (req, res) => {
 res.json({ emojiapprovers: client.emojiapprovers });
});
router.get("/emojiapprovers/:id", (req, res) => {
 if (req.params.id) {
  var condition = client.emojiapprovers.includes(req.params.id);
  res.json({ condition });
 }
 else res.json({ error: "id_not_sent" });
});
router.get("/mods", (req, res) => {
 res.json({ mods: client.mods });
});
router.get("/mod/:id", (req, res) => {
 if (req.params.id) {
  var condition = client.mods.includes(req.params.id);
  res.json({ condition });
 }
 else res.json({ error: "id_not_sent" });
});
router.get("/contributors", (req, res) => {
 res.json({ contributors: client.contributors });
});
router.get("/contributors/:id", (req, res) => {
 if (req.params.id) {
  var condition = client.contributors.includes(req.params.id);
  res.json({ condition });
 }
 else res.json({ error: "id_not_sent" });
});
router.post("/log", (req, res) => {
 try {
  if (req.body.secret === process.env.SECRET) {
   const msg = new Discord.MessageEmbed()
    .setTitle(req.body.title || "RDL Logging")
    .setColor(req.body.color || "#7289DA")
    .setDescription(req.body.desc || "No description provided.\n:/&&")
    .setURL(req.body.url || "https://discord.rovelstars.com")
    .setTimestamp()
    .setThumbnail(req.body.img || "https://discord.rovelstars.com/favicon.ico");

   client.guilds.cache.get("602906543356379156").channels.cache.get(req.body.channels || "775231877433917440").send(msg)
   if (req.body.owners) {
    for (const owner of req.body.owners) {
     client.users.cache.get(owner).send(msg);
    }
   }
   res.json({ code: "worked" });
  }
  else {
   res.json({ error: "wrong_or_no_key" });
  }
 }
 catch {}
});
module.exports = router;