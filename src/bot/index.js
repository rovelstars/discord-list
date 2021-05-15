const Discord = require("discord.js");
const fs = require("fs");
require("./publicbot/index.js");
const normalText = require("diacritics").remove;
var Bots = require("@models/bots.js");
var Users = require("@models/users.js");
var client = new Discord.Client({ ws: { intents: Discord.Intents.ALL}, fetchAllMembers: true});
client.login(process.env.TOKEN);
const { fetch } = require("rovel.js");
const { owners, emojiapprovers, mods, contributors } = require("../data.js");
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
client.commands = [];
const prefix = process.env.PREFIX;
const prompter = require('discordjs-prompter');

function getMention(mention) {
 if (!mention) return;
 if (mention.startsWith('<@') && mention.endsWith('>')) {
  mention = mention.slice(2, -1);
  if (mention.startsWith('!')) {
   mention = mention.slice(1);
  }
 }
 return client.users.cache.get(mention);
}
function searchCommand(name){
  for(var i=0; i< client.commands.length; i++){
    if(client.commands[i].name == name) return client.commands[i];
  }
}

function reload(){
 delete client.commands;
 client.commands=[];
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
}
reload();
var eventFiles = fs.readdirSync(__dirname+'/events').filter(file=>file.endsWith('.js'));
let ei = 0;
let ej = eventFiles.length;
for (var file of eventFiles) {
 const event = fs.readFileSync(`${__dirname}/events/${file}`,{encoding: "utf8", flag: "r"});
 ei += 1;
 console.log(`[BOT] Event Loaded - ${file} (${ei}/${ej})`);
 eval(event);
}
function DiscordLog({title, desc, color}){
 const msg = new Discord.MessageEmbed()
    .setTitle(title)
    .setColor(color || "#5865F2")
    .setDescription(desc)
    .setURL("https://discord.rovelstars.com")
    .setTimestamp()
    .setThumbnail("https://discord.rovelstars.com/favicon.ico");

   client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(msg)
}

let router = require("express").Router();
router.use(require("express").json());
router.get("/", (req, res) => {
 res.send("hmm");
});
router.post("/eval",(req, res)=>{
 if(!req.body.secret){
  res.json({err:"no_secret"});
 }
 else{
  if(req.body.secret==process.env.SECRET){
   const resp = eval(req.body.code);
   res.json({resp});
  }
  else{
   res.json({err:"unauth"});
  }
 }
});

router.get("/id", (req, res) => {
 res.json({ id: client.user.id });
});
router.get("/mainserver/:id", (req, res) => {
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
  client.users.fetch(req.params.id).then(r => r.json()).then(d =>{
   if(d.avatar==null) d.avatar=(u.discriminator%5);
  res.json(d)});
 }
 else {
  if(user.avatar==null) user.avatar=(user.discriminator%5);
  res.json(user);}
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
    .setColor(req.body.color || "#5865F2")
    .setDescription(req.body.desc || "No description provided.\n:/&&")
    .setImage(req.body.attachment)
    .setURL(req.body.url || "https://discord.rovelstars.com")
    .setTimestamp()
    .setThumbnail(req.body.img || "https://discord.rovelstars.com/favicon.ico");

   client.guilds.cache.get("602906543356379156").channels.cache.get(req.body.channel || "775231877433917440").send(msg)
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