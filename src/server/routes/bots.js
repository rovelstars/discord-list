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
router.delete("/:id", (req, res)=>{
 Bots.deleteOne({_id: req.params.id}, function (err) {
  if (err) return res.send(err);
  res.send(`${req.params.id} deleted`);
 })
})
router.post("/new", (req, res)=>{
 console.log(req.body);
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
  if(err) return res.send(err);
  if(!err){ 
   res.send(bot);
  fetch(process.env.WEBHOOK, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL New Bot Added!",
   "content": `Bot <@!${bot.id}> has been added by <@!${bot.owners[0].id}>`
  })
 });
 
  }
 });
});
module.exports = router;