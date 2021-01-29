let Bots = require("@models/bots.js");
let {client} = require("@bot/index.js");
let router = require("express").Router;
router.post("/", (req, res)=>{
 const bot = new Bots({
  _id: req.body.id,
 owners: req.body.owners,
 short: req.body.short,
 desc: req.body.desc,
 verified: false,
 support: req.body.support,
 bg: req.body.bg,
 github: req.body.github,
 website: req.body.website,
 donate: req.body.donate,
 invite: req.body.invite,
 servers: undefined,
 ramUsed: undefined,
 ramLeft: undefined,
 msgGot: undefined,
 cmdGot: undefined,
 msgSent: undefined,
 promoted: false,
 votes: 0
 });
 
 bot.save((err, bot)=>{
  const msg = err? `{status: 500, msg: ${err}` : `{status: 200, msg: "Bot Added"`;
  res.send(msg);
  client.channels.cache.get("804250610571673600").send(`**New Bot Added!**\nBot: <@!${bot._id}>`);
 })
})