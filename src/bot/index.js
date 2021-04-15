const Discord = require("discord.js");
const fs = require("fs");
var Bots = require("@models/bots.js");
var Users = require("@models/users.js");
var client = new Discord.Client();
client.login(process.env.TOKEN);
const { fetch } = require("rovel.js");
const { owners, emojiapprovers, mods, contributors } = require("../data.js");
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
client.commands = [];
const prefix = "hmm!" || process.env.PREFIX;
var cooldowndaily = new Set();


function getIDFromMention(mention) {
 if (!mention) return;
 if (mention.startsWith('<@') && mention.endsWith('>')) {
  mention = mention.slice(2, -1);
  if (mention.startsWith('!')) {
   mention = mention.slice(1);
  }
  return mention
 }
}
function searchCommand(name){
  for(var i=0; i< client.commands.length; i++){
    if(client.commands[i].name == name) return client.commands[i];
  }
}


var commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));
let ci = 0;
let cj = commandFiles.length;
for (var file of commandFiles) {
 const command = fs.readFileSync(`${__dirname}/commands/${file}`,{encoding: "utf8", flag: "r"});
 ci += 1;
 console.log(`[BOT] Command Loaded - ${file} (${ci}/${cj})`);
 file = file.replace(".js","");
 const desc = fs.readFileSync(`${__dirname}/desc/${file}.md`,{encoding: "utf8",flag: "r"});
 client.commands.push({name: file, code: command, desc});
}

var eventFiles = fs.readdirSync(__dirname+'/events').filter(file=>file.endsWith('.js'));
let ei = 0;
let ej = eventFiles.length;
for (var file of eventFiles) {
 const event = fs.readFileSync(`${__dirname}/events/${file}`,{encoding: "utf8", flag: "r"});
 ei += 1;
 console.log(`[BOT] Event Loaded - ${file} (${ei}/${ej})`);
 eval(event);
}
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