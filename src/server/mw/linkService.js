//let router = require("express").Router();
function mw(Req, Res, Next){
 app = Req.app;
 if(req.hostname=="dscrdly.com"){
  app.get("/b/:slug", (req, res)=>{
   Cache.Bots.findOne({slug: req.params.slug}).then(bot=>{
    if(bot){
     res.redirect(`https://discord.rovelstars.com/bots/${bot.id}`);
    }
    else{
     res.redirect(`https://discord.rovelstars.com/404`);
    }
   })
  });
 }
}
module.exports = mw;