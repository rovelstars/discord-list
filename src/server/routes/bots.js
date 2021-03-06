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
router("/:id", (req, res)=>{
 Bots.findById(req.params.id, (err, doc)=>{
  if(err) return res.json({err});
  res.json({prefix: doc.prefix});
 });
});
router.delete("/:id", (req, res)=>{
 Bots.deleteOne({_id: req.params.id}, function (err) {
  if (err) return res.send(err);
  res.send(`${req.params.id} deleted`);
  fetch("https://bots.rovelstars.ga/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${req.params.id}> has been deleted`,
   "title": "Bot Deleted!",
   "color": "#ff0000",
   "url": `https://bots.rovelstars.ga/`
  })
 }).then(r=>r.text()).then(d=>console.log(d));
 })
})

router.post("/new", (req, res)=>{
 console.log(req.body);
 const bot = new Bots({
 _id: req.body.id,
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
  fetch("https://bots.rovelstars.ga/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${bot.id}> has been added by <@!${bot.owners[0].id}>`,
   "title": "New Bot Added!",
   "color": "#31CB00",
   "url": `https://bots.rovelstars.ga/bots/${bot.id}`
  })
 }).then(r=>r.text()).then(d=>console.log(d));
  }
 });
});
module.exports = router;