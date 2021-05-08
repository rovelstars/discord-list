let router = require("express").Router();
var {fetch} = require("rovel.js");
const Bots = require("@models/bots.js");
router.get("/bots/:id/status", (req,res)=>{
 Bots.findOne({id: req.params.id}).then(bot=>{
  if(!bot) return res.send("no_bot");
  if(!bot.status) bot.status = "ONLINE";
  const style = (req.query.style)?req.query.style:"for-the-badge";
  const color = (req.query.color)?req.query.color:"43b581";
  const label = (req.query.label)?req.query.label:"Status";
  fetch(`https://img.shields.io/static/v1?label=${label}&message=${bot.status}&color=${color}&style=${style}`).then(r=>r.text()).then(d=>{
  res.send(d);
 });
});
});

module.exports = router;