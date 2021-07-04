let router = require("express").Router();

router.get("/b/:slug",(req, res, next)=>{
 if(req.hostname!="dscrdly.com"){
  next();
 }
 else{
  Cache.Bots.findOne({slug: req.params.slug}).then(bot=>{
   if(!bot){
    res.render("404.ejs", { path: req.originalUrl });
   }
   else{
    res.redirect(`${process.env.DOMAIN}/bots/${bot.id}`);
   }
  })
 }
})

router.get("*",(req, res, next)=>{
 if(req.hostname=="dscrdly.com"){
  res.redirect(`${process.env.DOMAIN}${req.originalUrl}`);
 }
 else{
  next();
 }
})

module.exports = router;