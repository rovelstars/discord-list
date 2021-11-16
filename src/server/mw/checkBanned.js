module.exports = async function(req, res, next) {
 var user = res.locals.user;
 if (user) {
  if (typeof BannedList != "undefined") {
   const Isbanned = (BannedList.includes(user.id)) ? true : false;
   if (Isbanned) {
    res.sendFile(path.resolve("src/public/assets/banned.html"));
    fetch(`${process.env.DOMAIN}/api/client/log`, {
     method: "POST",
     headers: {
      "content-type": "application/json"
     },
     body: JSON.stringify({
      "secret": process.env.SECRET,
      "title": `Banned User ${user.tag} tried to visit us!`,
      "color": "#ff0000",
      "desc": `**${user.tag}** (${user.id}) was banned before, and they tried to visit our site at path:\n\`${req.path}\``
     })
    })
   }
   else{
     Cache.Users.findOne({id: user.id}).then(u=>{
       if(!u){
         res.cookie('key', req.cookies['key'], { maxAge: 0 });
         res.redirect("/?alert=deletion");
       }
       else {
       next();
       }
     });
   }
  }
  else {
   console.log("[WARN] BannedList is not initialized. No user checkup will be done.");
   Cache.Users.findOne({ id: user.id }).then(u => {
     if (!u) {
       res.cookie('key', req.cookies['key'], { maxAge: 0 });
       res.redirect("/?alert=deletion");
     }
     else {
       next();
     }
   });
  }
 }
 else {
  next();
 }
};