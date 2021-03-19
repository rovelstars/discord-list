let Bots = require("@models/bots.js");
let {fetch} = require("rovel.js");
let router = require("express").Router();
router.use(require("express").json())
router.get("/", (req, res)=>{
 Bots.find(function (err, bots){
  if (err) return console.error(err);
  res.send(bots);
 })
});
router.get("/:id", (req, res)=>{
 Bots.findById(req.params.id, (err, doc)=>{
  if(err) return res.json({err});
  res.json({prefix: doc.prefix});
 });
});
router.get("/:id/added", async (req, res)=>{
 if(req.query.secret === process.env.SECRET){
  const bot = await Bots.findOne({id: req.params.id});
  bot.added = true;
  await bot.save();
  res.send(`${bot.added}`);
  fetch("https://discord.rovelstars.com/client/log", {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "desc": `Bot <@!${req.params.id}> has been added to this server and is getting listed on RDL!`,
    "title": "Bot Listed!",
    "color": "#FEF40E",
    "owner": bot.owners[0],
    "url": `${process.env.DOMAIN}/bots/${bot.id}`
   })
  })
 }
});
router.delete("/:id", (req, res)=>{
 if(!req.query.key) return res.json({err: "no_key"});
 
 fetch(`${process.env.DOMAIN}/auth/user?key=${req.query.key}`).then(r=>r.json()).then(d=>{
  if(d.err) return res.json({err: "invalid_key"});
  const bot = Bots.findOne({id: req.params.id});
  if(bot.owners.includes(d.id)){
   Bots.deleteOne({id: req.params.id}, function (err) {
  if (err) return res.json(err);
  res.send(`${req.params.id} deleted`);
  fetch("https://discord.rovelstars.com/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${req.params.id}> has been deleted by <@!${d.id}>`,
   "title": "Bot Deleted!",
   "color": "#ff0000",
   "owner": d.id,
   "url": `https://discord.rovelstars.com/`
  })
 }).then(r=>r.text()).then(d=>console.log(d));
 })
  }
 });
})

router.post("/new", (req, res)=>{
 console.log(req.body);
 const bot = new Bots({
 id: req.body.id,
 owners: req.body.owners,
 short: req.body.short,
 desc: req.body.desc,
 prefix: req.body.prefix,
 verified: false,
 support: req.body.support,
 bg: req.body.bg,
 github: req.body.github,
 website: req.body.website,
 donate: req.body.donate,
 invite: req.body.invite
 }).save((err, bot)=>{
  if(err) return res.send(err);
  if(!err){ 
   res.send(bot);
  fetch("https://discord.rovelstars.com/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${bot.id}> has been added by <@!${bot.owners[0]}>`,
   "title": "New Bot Added!",
   "color": "#31CB00",
   "owner": bot.owners[0],
   "url": `https://discord.rovelstars.com/bots/${bot.id}`
  })
 }).then(r=>r.text()).then(d=>console.log(d));
  }
 });
});
module.exports = router;