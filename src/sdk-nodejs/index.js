var {fetch} = require("rovel.js");

module.exports=function(options){
 const {key, domain} = options;
return function(req, res, next){
 if(!key) return console.error("[RDL] No key provided");
 if(key){
  fetch(`https://discord.rovelstars.com/api/bots/info?code=${key}`).then(r=>r.json()).then(bot=>{
   console.log(`[RDL] Logined as ${bot.tag}`);
  })
 }
 if(req.path.includes("/vote") && req.method==="POST" && req.query.code===key){
  res.json({ok: true});
  console.log(`[RDL] New Vote! `+req.body.votes);
 }
}}