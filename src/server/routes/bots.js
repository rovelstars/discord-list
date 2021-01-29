let Bots = require("@models/bots.js");
const bodyParser = require('body-parser');
let {client} = require("@bot/index.js");
let router = require("express").Router();
router.use(bodyParser.json());
router.get("/", (req, res)=>{
 Bots.find(function (err, bots){
  if (err) return console.error(err);
  res.send(bots);
 })
})
router.post("/new", (req, res)=>{
 console.log(req);
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
 invite: req.body.invite
 }).save((err, bot)=>{
  if(err) res.send(err);
  if(!err){ 
   res.send(bot);
  client.channels.cache.get("804250610571673600").send(`**New Bot Added!**\nBot: <@!${bot._id}>\nOwner: <@!${bot.owners[0].id}>`);
  }
 });
});
module.exports = router;