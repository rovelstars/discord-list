let Bots = require("@models/bots.js");
let {fetch} = require("rovel.js");
const schedule = require("node-schedule");
let router = require("express").Router();
router.use(require("express").json());

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = 5;
rule.hour = 22;
rule.minute = 40;

const job = schedule.scheduleJob(rule, function(){
 Bots.find(async function (err, bots){
  for(let bot of bots){
   bot.votes = 1;
  }
  await bots.push();
 })
  fetch(`${process.env.DOMAIN}/api/client/log`, {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "desc": "It is now the Scheduled Time!\nThe Votes of all bots will now be **RESETED**!\nStart voting your bots again to reach the top of the Leaderboard!",
    "title": "Votes Reseted!",
    "color": "#ff0000"
   })
  });
});

router.get("/", (req, res)=>{
 Bots.find(function (err, bots){
  if (err) return console.error(err);
  res.send(bots);
 })
});
router.get("/:id", (req, res)=>{
 Bots.findOne({id: req.params.id}).then(bot=>{
  res.json(bot);
 });
});
router.get("/:id/added", async (req, res)=>{
 if(req.query.secret === process.env.SECRET){
  const bot = await Bots.findOne({id: req.params.id});
  bot.added = true;
  await bot.save();
  res.send(`${bot.added}`);
  fetch("https://discord.rovelstars.com/api/client/log", {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "desc": `Bot <@!${req.params.id}> has been added to this server and is getting listed on RDL!`,
    "title": "Bot Listed!",
    "color": "#FEF40E",
    "owners": bot.owners,
    "url": `${process.env.DOMAIN}/api/bots/${bot.id}`
   })
  })
 }
});
router.delete("/:id", (req, res)=>{
 if(!req.query.key) return res.json({err: "no_key"});
 
 fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(d=>{
  if(d.err) return res.json({err: "invalid_key"});
  
  Bots.findOne({id: req.params.id}).then(bot=>{
   if(bot.owners.includes(d.id)){
   Bots.deleteOne({id: req.params.id}, function (err) {
  if (err) return res.json(err);
  res.json({deleted: true});
  fetch("https://discord.rovelstars.com/api/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${req.params.id}> has been deleted by <@!${d.id}>`,
   "title": "Bot Deleted!",
   "color": "#ff0000",
   "owners": bot.owners,
   "url": `https://discord.rovelstars.com/`
  })
 });
 })
  }
  else return res.json({err: "unauth"});
  });
 });
})

router.post("/new", (req, res)=>{
 for(const owner of req.body.owners){
  fetch(`${process.env.DOMAIN}/api/client/mainserver/members/${owner}`).then(r=>r.json()).then(d=>{
   if(!d.condition) return res.json({err: "owner_not_in_server"});
  })
 }
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
  fetch("https://discord.rovelstars.com/api/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${bot.id}> has been added by <@!${bot.owners[0]}>`,
   "title": "New Bot Added!",
   "color": "#31CB00",
   "owners": bot.owners,
   "url": `https://discord.rovelstars.com/api/bots/${bot.id}`
  })
 });
  }
 });
});
module.exports = router;