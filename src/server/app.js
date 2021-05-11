const port = process.env.PORT || 3000;
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
const actuator = require('express-actuator');
const marked = require("marked");
let BotAuth = require("@models/botauth.js");
const geoip = require("geoip-lite");
var cloudflare = require('cloudflare-express');
var Bots = require("@models/bots.js");
let Users = require("@models/users.js");
var Servers = require("@models/servers.js");
const servers = require("@routes/servers.js");
const embeds = require("@routes/embeds.js");
const users = require("@routes/users.js");
var latency = require("response-time");
const info = require("@utils/info.js");
const app = require("express")();
const express = require("express");
var compression = require("compression");
let client = require("@bot/index.js");
let auth = require("@utils/auth.js");
const authRoute = require("@routes/authclient.js");
module.exports = { app, port };
var cookieParser = require("cookie-parser");
app.use(cloudflare.restore({update_on_start:true}));
app.disable('x-powered-by');
app.use(cookieParser({filter: true}));
app.use(compression());
let log = console.log;
const rovel = require("rovel.js")
const fetch = rovel.fetch;
const dayjs = rovel.time;
const rateLimit = require("express-rate-limit");
let path = require("path");
const bots = require('@routes/bots.js');
setTimeout(()=>{
 console.log(rovel.text.green(`Everything Started! RDL is ready to go!`))
}, 5000);
// ejs setting
app.set('view engine', 'ejs');
app.set('views', path.resolve("src/views"));
const limiter = rateLimit({
 windowMs: 30 * 1000, // 30 secs
 max: 300 // limit each IP to 300 requests per windowMs
});
app.set('trust proxy', 1);
app.use("/api", limiter);
process.on('unhandledRejection', err => {
 var unre = function(req, res, next) {
  log(error("**PROCESS** - Unhandled Rejection:\n") + warn(err));
  next(err);
  app.use(unre);
 }
});
app.use(latency({header: "ping"}));
app.use(actuator({basePath:"/api"}));
var booting = function(req, res, next){
 if(process.uptime()< 10){
  if(req.originalUrl.startsWith("/assets")||req.originalUrl.startsWith("/api")) next();
  else res.sendFile(path.resolve("src/public/assets/loading.html"));
 }
 else next();
}
app.use(booting);
var checkBanned = async function(req, res, next) {
 if(req.header('RDL-key')){
  req.query.key = req.header('RDL-key');
 }
 if(req.header('RDL-code')){
  req.query.code = req.header('RDL-code');
 }
 if(req.query.key){
  req.cookies['key']=req.query.key;
 }
 if(req.query.code){
  req.cookies['code']=req.query.code;
 }
 if(req.cookies['key']){
  req.query.key = req.cookies['key'];
  var user = await auth.getUser(req.cookies['key']).catch(()=>{next()});
  if(user){
  fetch(`${process.env.DOMAIN}/api/client/bannedusers/${user.id}`).then(r=>r.json()).then(d=>{
   if(d.banned){
    res.sendFile(path.resolve("src/public/assets/banned.html"));
    fetch(`${process.env.DOMAIN}/api/client/log`, {
     method: "POST",
     headers: {
      "content-type": "application/json"
     },
     body: JSON.stringify({
      "secret": process.env.SECRET,
      "title": `Banned User ${user.tag} tried to visit us!`,
      "color": "#ff0000",
      "desc": `**${user.tag}** (${user.id}) was banned before, and they tried to visit our site at path:\n\`${req.path}\``
     })
    })
   }
   else {
   req.user = user;
    next()
   }
  });
 }}
 else {
  req.user = null;
  next()
 }
};
app.use(checkBanned);
var weblog = async function(req, res, next) {
 const weburl = process.env.WEBHOOK;
 if(req.query.code){
  var botu = await BotAuth.findOne({code: req.query.code});
 if(botu){
  botu=botu.id;
 }}
 const user = (req.user)?req.user.tag:"Not logined";
 const geo = await geoip.lookup(req.cf_ip);
 const logweb = `**New Log!**\n**Time:** \`${dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")}\`\n**IP:** ||${req.cf_ip}||\n**Path requested:** \`${req.originalUrl}\`\n**Request type:** \`${req.method}\`\n**Location:** ${(geo)?geo.timezone:"idk"}\n**User:** ${user}\n**Bot:** \`${botu || "nope"}\`\n**Browser:** \`${(req.headers['user-agent'])?req.headers['user-agent']:"api request"}\``;
 await fetch(weburl, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL logging",
   "content": logweb
  })
 });
 next();
}
app.use(weblog);

log("[SERVER] Started!\n[SERVER] Webhooks started!");

app.use('/assets', express.static(path.resolve("src/public/assets")));
app.use('/api/bots', bots);
app.use('/api/users', users);
app.use('/api/auth', authRoute);
app.use('/api/client', client);
app.use('/api/servers', servers);
app.use('/api/embeds', embeds);

app.get('/api', (req, res)=>{
 res.json({hello: "coder!"});
})

app.get('/api/*', (req, res)=>{
 res.json({err: 404});
})

app.get("/", async (req, res) => {
 var bots = await Bots.find({added: true});
 shuffle(bots);
 var user = req.user;
 await res.render('index.ejs', {user, bots});
});

let TopVotedBots;
let NewAddedBots;
async function UpdateBots(){
 TopVotedBots = await Bots.find({added: true}).sort({votes: -1}).limit(10);
 NewAddedBots = await Bots.find({added: true});
 NewAddedBots = NewAddedBots.reverse().slice(0,10);
}
UpdateBots();
setInterval(UpdateBots,300000);
app.get("/bots", async (req, res) => {
 shuffle(bots);
 var user = req.user;
 await res.render('bots.ejs', {user, nbots: NewAddedBots});
});

app.get("/manifest.json", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/manifest.json"));
});

let sitemap;
async function gensitemap(){
 const allbots = await Bots.find({});
 const botsmap = allbots.map((bot)=>{return `<url>\n<loc>${process.env.DOMAIN}/bots/${bot.id}</loc>\n<priority>0.9</priority>\n<changefreq>hourly</changefreq></url>`}).join("\n");
 const Sitemap= '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'+`\n<url>\n<loc>${process.env.DOMAIN}/</loc>\n<priority>1.00</priority><changefreq>daily</changefreq>\n</url>`+botsmap+'</urlset>';
 return Sitemap;
};
(async()=>{sitemap = await gensitemap();fetch(`https://google.com/ping?sitemap=${process.env.DOMAIN}/sitemap.xml`);});
setInterval(async function(){sitemap = await gensitemap();fetch(`https://google.com/ping?sitemap=${process.env.DOMAIN}/sitemap.xml`);},3600000);
app.get("/sitemap.xml", async (req, res)=>{
 res.header('Content-Type', 'application/xml');
 if(!sitemap){
  sitemap = await gensitemap();
  res.send(sitemap);
 }
 else{
  res.send(sitemap);
 }
});

app.get("/bots/:id/vote", async (req, res)=>{
 if(!req.user && (!(req.headers['user-agent'].includes("bot")))) return res.redirect("/login");
 else{
 var bot = await Bots.findOne({id: req.params.id});
 if(!bot) return await res.send("-_-");
 else{
 var user = req.user;
 bot.owner = [];
 var u = await Users.findOne({id: user.id});
 if(!u) return res.redirect("/login");
 else{
  user.bal = u.bal;
 await res.render('botvote.ejs', {user, bot});
 }}
 }
});

app.get("/bots/:id", async (req, res)=>{
 var bot = await Bots.findOne({id: req.params.id});
 if(!bot) return await res.send("-_-");
 bot.desc = await marked(bot.desc);
 var user = req.user;
 bot.owner = [];
 for(const id of bot.owners){
  await fetch(`${process.env.DOMAIN}/api/client/users/${id}`).then(r=>r.json()).then(async d=>{
  await bot.owner.push(d.tag);
 });
 };
 await res.render('botpage.ejs', {user, bot});
});

app.get("/dashboard", async (req, res)=>{
 if(!req.user) return res.redirect("/login");
 else {
  let botus =[];
  Users.findOne({id: req.user.id}).then(async u=>{
   req.user.bal = rovel.approx(u.bal);
  Bots.find({$text:{$search: req.user.id}}).then(async bots=>{
   for(const bot of bots){
    if(bot.owners.includes(req.user.id)){
     await botus.push(bot);
    }
   }
  await res.render('dashboard.ejs', {user: req.user, bots: botus});
  });
  });
 }
});

app.get("/dashboard/bots/new", async (req, res)=>{
 if(!req.user) return res.redirect("/login");
 await res.render('dashboard-newbot.ejs', {user: req.user});
});

app.get("/status", (req, res)=>{
 res.render('status.ejs',{});
});

app.get("/loaderio-39a018887f7a2f8e525d19a772e9defe", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/verify.txt"));
});

app.get("/favicon.ico", (req, res) => {
 res.redirect("/assets/img/logo.png");
});
app.get("/robots.txt", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/robots.txt"));
});

app.get("/server", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/invite.html"));
});

app.get("/email", (req, res)=>{
 res.redirect("mailto: support@rovelstars.com");
});

app.get("/arc-sw.js", (req, res) => {
 res.sendFile(path.resolve("src/public/assets/arc-sw.js"));
});

app.get("/beta", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/join.html"));
});

 app.get("/login", (req, res)=>{
  if(req.cookies['key']) res.cookie('key', req.cookies['key'], {maxAge: 0});
  res.set("X-Robots-Tag","noindex");
 res.redirect(auth.auth.link);
});

app.get("/logout", async (req, res)=>{
 if(req.cookies['key']){
  const user = await auth.getUser(req.cookies['key']).catch(()=>{});
  fetch(`${process.env.DOMAIN}/api/client/log`, {
   method: "POST",
   headers: {
    "content-type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "title": `${(user)?user.tag:"IDK who"} Logouted!`,
    "desc": `Bye bye ${(user)?user.tag:"Unknown Guy"}\nSee you soon back on RDL!`,
    "color": "#ff0000",
    "img": (user)?user.avatarUrl(128):`${process.env.DOMAIN}/favicon.ico`,
    "owners": (user)?user.id:null
   })
  })
  res.cookie('key', req.cookies['key'], {maxAge: 0});
  
 }
 res.redirect("/");
});

app.get("*", (req, res) => {
 res.sendFile(path.resolve("src/public/assets/index.html"));
 });