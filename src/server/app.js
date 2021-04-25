const port = process.env.PORT || 3000;
const actuator = require('express-actuator');
const marked = require("marked");
let BotAuth = require("@models/botauth.js");
const geoip = require("geoip-lite");
var cloudflare = require('cloudflare-express');
var Bots = require("@models/bots.js");
var Servers = require("@models/servers.js");
const servers = require("@routes/servers.js");
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
 const logweb = `**New Log!**\n**Time:** \`${dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")}\`\n**IP:** ||${req.cf_ip}||\n**Path requested:** \`${req.originalUrl}\`\n**Request type:** \`${req.method}\`\n**Location:** ${(geo)?geo.timezone:"idk"}\n**User:** ${user}\n**Bot:** \`${botu || "nope"}\``;
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

app.get('/api', (req, res)=>{
 res.json({hello: "coder!"});
})

app.get('/api/*', (req, res)=>{
 res.json({err: 404});
})

app.get("/", async (req, res) => {
 var bots = await Bots.find();
 var user = req.user;
 await res.render('index.ejs', {user, bots});
});

app.get("/bots", async (req, res) => {
 var bots = await Bots.find();
 var user = req.user;
 await res.render('bots.ejs', {user, bots});
});

app.get("/manifest.json", (req, res)=>{
 res.sendFile(path.resolve("src/public/assets/manifest.json"));
});
/*
var sitemap;
app.get("/sitemap.xml", async (req, res)=>{
 try{
 res.header('Content-Type', 'application/xml');
 res.header('Content-Encoding', 'gzip');
 if(sitemap){
  res.send(sitemap);
  return;
 }
 const allbots = await Bots.find({added: true}).select('id');
 const botsmap = await allbots.map((id)=>{`/bots/${id}`});
 
 const smStream = new SitemapStream({ hostname: 'https://discord.rovelstars.com/' })
 const pipeline = smStream.pipe(createGzip())
 botsmap.forEach((item)=>{
  smStream.write({ url: item, changefreq: 'daily', priority: 0.6})
 });
 streamToPromise(pipeline).then(sm=>sitemap=sm);
 pipeline.pipe(res).on('error', (e)=>{throw(e)});
 smStream.end();
 console.log("hmm",sitemap);
 } catch(e){
  console.log(e);
 }
});*/

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
 await console.log(bot.owner);
 await res.render('botpage.ejs', {user, bot});
});

app.get("/dashboard", async (req, res)=>{
 if(!req.user) return res.redirect("/login");
 else {
  let botus =[];
  Bots.find({$text:{$search: req.user.id}}).then(async bots=>{
   for(const bot of bots){
    if(bot.owners.includes(req.user.id)){
     await botus.push(bot);
    }
   }
  await res.render('dashboard.ejs', {user: req.user, bots: botus});
  });
 }
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
  if(req.cookies['key']) return res.redirect("/");
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
 process.emit("testing", {hello: "world"});