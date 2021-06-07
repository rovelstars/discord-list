const port = process.env.PORT || 3000;

function shuffle(array) {
 var currentIndex = array.length,
  temporaryValue, randomIndex;
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
globalThis.shuffle = shuffle;
const { langs } = require("../data.js");
let ping;
const actuator = require('express-actuator');
const marked = require("marked");
const geoip = require("geoip-lite");
var cloudflare = require('cloudflare-express');
globalThis.Bots = require("@models/bots.js");
globalThis.Users = require("@models/users.js");
globalThis.Servers = require("@models/servers.js");
const servers = require("@routes/servers.js");
const embeds = require("@routes/embeds.js");
const prefers = require("@routes/prefers.js");
const users = require("@routes/users.js");
const comments = require("@routes/comments.js");
var latency = require("response-time");
globalThis.translate = require("translatte");
const info = require("@utils/info.js");
const app = require("express")();
const express = require("express");
var compression = require("compression");
var agents = require("@utils/agents.json");
let client = require("@bot/index.js");
let auth = require("@utils/auth.js");
const authRoute = require("@routes/authclient.js");
module.exports = { app, port };
var cookieParser = require("cookie-parser");
app.use(cloudflare.restore({ update_on_start: true }));
app.disable('x-powered-by');
app.use(cookieParser({ filter: true }));
app.use(compression());
let log = console.log;
globalThis.rovel = require("rovel.js")
const fetch = rovel.fetch;
const dayjs = rovel.time;
const rateLimit = require("express-rate-limit");
let path = require("path");
const bots = require('@routes/bots.js');
const non_api = require("@routes/non-api.js");
setTimeout(() => {
 console.log(rovel.text.green(`Everything Started! RDL is ready to go!`))
}, 5000);
// ejs setting
app.set('view engine', 'ejs');
app.set('views', path.resolve("src/views"));
app.use(express.json());
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
app.use(latency({ header: "ping" }));
app.use(actuator({ basePath: "/api" }));
var booting = function(req, res, next) {
 if (process.uptime() < 10) {
  if (req.originalUrl.startsWith("/assets") || req.originalUrl.startsWith("/api")) next();
  else res.sendFile(path.resolve("src/public/assets/loading.html"));
 }
 else next();
}
app.use(booting);

setInterval(() => {
 fetch(`${process.env.DOMAIN}/api`).then(r => {
  globalThis.ping = r.headers.get("ping");
  app.locals.ping = r.headers.get("ping");
 });
}, 1000 * 60);
fetch(`${process.env.DOMAIN}/api`).then(r => {
 globalThis.ping = r.headers.get("ping");
 app.locals.ping = r.headers.get("ping");
});

var checkBanned = async function(req, res, next) {
 res.locals.req = req;
 res.locals.res = res;
 req.language = eval(`langs.${req.locale}`);
 var themes = ["discord", "dracula"];
 if (!themes.includes(req.cookies['theme'])) {
  req.cookies["theme"] = "discord";
  res.cookie('theme', "discord", {
   maxAge: 30 * 3600 * 24 * 1000, //30days
   httpOnly: true,
   secure: true
  });
 }
 res.locals.theme = (req.cookies["theme"]) ? req.cookies["theme"] : "discord";
 if (req.header('RDL-key')) {
  req.query.key = req.header('RDL-key');
 }

 if (req.header('RDL-code')) {
  req.query.code = req.header('RDL-code');
 }
 if (req.query.key) {
  req.cookies['key'] = req.query.key;
 }
 if (req.query.code) {
  req.cookies['code'] = req.query.code;
 }
 if (req.cookies['key']) {
  req.query.key = req.cookies['key'];
  let user = await auth.getUser(req.cookies['key']).catch(async () => {
   try {
    let tempvalid = auth.checkValidity(req.cookies['key']);
    /*
   {
  expired: false,
  expiresIn: 538994851,
  expireTimestamp: 1623434339257
}
*/
    if (tempvalid.expired) {
     // ah yes the key really expired!
     const newkey = await auth.refreshToken(req.cookies['key']);
     // check whether he got email scope of not (temp case as of now)
     const tempuser = await auth.getUser(newkey);
     if (tempuser.emailId) {
      //he got it!
      res.cookie('key', newkey, {
       maxAge: 90 * 3600 * 24 * 1000, //90days
       httpOnly: true,
       secure: true
      });
      res.redirect("/?alert=key_refreshed"); //send back to homepage because idk what would he do on other pages, and notify him that key was refreshed.
     }
     else {
      //logout him simply because he doesnt have email scope.
      res.cookie('key', req.cookies['key'], { maxAge: 0 });
      res.redirect("/?alert=logout");
     }
    }
    else {
     res.cookie('key', req.cookies['key'], { maxAge: 0 });
     res.redirect("/?alert=logout");
    }
   }
   catch (e) {
    res.cookie('key', req.cookies['key'], { maxAge: 0 });
    res.redirect("/?alert=logout");
   }
  });
  if (user) {
   let list = BannedList;
   let ban = list.map(user => user.user.id);
   const Isbanned = (ban.includes(req.params.id)) ? true : false;
   if (Isbanned) {
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
    if (!user.emailId) {
     /*wip*/
    }
    else {
     res.locals.user = user;
     next();
    }
   }
  }
 }
 else {
  res.locals.user = null;
  next()
 }
};
app.use(checkBanned);
var i18n = require("i18n");
i18n.configure({
 locales: ["en", "hi", "ar", "es", "tr"],
 cookie: "lang",
 queryParameter: "lang",
 defaultLocale: "en",
 directory: path.resolve("node_modules/rdl-i18n/site")
});
app.use(i18n.init);
var weblog = async function(req, res, next) {
 const weburl = process.env.WEBHOOK;
 if (req.query.code) {
  var botu = await Bots.findOne({ code: req.query.code });
  if (botu) {
   botu = `${botu.id} (${botu.tag})`;
  }
 }
 const user = (res.locals.user) ? res.locals.user.tag : "Not logined";
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
 req.language = eval(`langs.${req.locale}`);
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
app.use('/api/comments', comments);
app.use('/api/embeds', embeds);
app.use('/api/preferences', prefers);

app.get('/api', (req, res) => {
 res.json({ hello: "coder!" });
})

app.get('/api/report', (req, res) => {
 if (req.query.link) {
  fetch("https://discord.rovelstars.com/api/client/log", {
   method: "POST",
   headers: {
    "content-type": "application/json"
   },
   body: JSON.stringify({
    secret: process.env.SECRET,
    channel: "838067036080963584",
    title: "Other's Deployment of RDL!",
    desc: `**Link:** ${req.query.link}`
   })
  })
 }
});

app.post("/api/translate", async (req, res) => {
 if (!req.body.text) {
  res.json({ err: "no_text" });
 }
 else {
  if (!req.body.to) {
   req.body.to = "en";
  }
  if (!req.body.from) {
   req.body.from = "auto";
  }
  if(typeof req.body.text=="object"){
  var arr = res.body.text;
  const a = arr;
  arr = arr.map(t => {
   return t.split("+").join("/+/");
  });
  arr = arr.join("++");
  translate(arr, { to: req.body.lang, from: req.body.from }).then(r => {
   r.text = r.text.split("++").map((t, i) => {
    t = t.split("/ + /").join("+").trim();
    if ((t.includes(" +")) && (!a[i].includes(" +"))) {
     t = t.split(" +").join("+");
    }
    return t;
   });
   res.json({text: r.text})
  });
  }
  if(typeof req.body.text == "string"){
   translate(req.body.text, {to: req.body.to, from: req.body.from}).then(r=>{
    res.json({text: r.text});
   })
  }
 }
});

app.get('/api/*', (req, res) => {
 res.json({ err: 404 });
})

app.get("/comments", (req, res) => {
 res.render("comments.ejs");
});
app.use("/comments", express.static(path.resolve("src/comments")));
app.get + ("/hi", (req, res) => {
 fetch(`${process.env.DOMAIN}`).then(r => r.text()).then(d => {
  translate(d, { to: "hi" }).then(re => {
   res.send(re.text);
  })
 })
});
app.use("/", non_api);