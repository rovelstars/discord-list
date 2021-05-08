let router = require("express").Router();
var {fetch} = require("rovel.js");
const Bots = require("@models/bots.js");
const b64f = require("fetch-base64");

router.get("/bots/:id/status", (req,res)=>{
 Bots.findOne({id: req.params.id}).then(bot=>{
  if(!bot) return res.send("no_bot");
  if(!bot.status) bot.status = "ONLINE";
b64f.remote(`${bot.avatarURL}?size=32`).then((data)=>{
 fetch(`https://img.shields.io/static/v1?label=Bot%20Status&message=${bot.status}&color=43b581&style=for-the-badge?logo=${data[1]}`).then(r=>r.text()).then(d=>{
  res.send(d);
 });
});
});
});

module.exports = router;