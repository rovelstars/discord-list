let router = require("express").Router();
var {fetch} = require("rovel.js");
const Bots = require("@models/bots.js");
router.get("/bots/:id/status", (req,res)=>{
 Bots.findOne({id: req.params.id}).then(bot=>{
  if(!bot) return res.send("no_bot");
  if(!bot.status) bot.status = "ONLINE";
  let color;
  if(bot.status=="online"){
   color="43b581";
  }
  else if(bot.status=="dnd"){
   color="f04747";
  }
  else if(bot.status=="idle"){
   color="faa61a";
  }
  else if(bot.status=="offline"){
   color="2f3136";
  }
  const style = (req.query.style)?req.query.style:"for-the-badge";
  color = (req.query.color)?req.query.color:color;
  const label = (req.query.label)?req.query.label:"Status";
  fetch(`https://img.shields.io/static/v1?label=${label}&message=${bot.status}&color=${color}&style=${style}`).then(r=>r.text()).then(d=>{
  res.send(d);
 });
});
});

module.exports = router;