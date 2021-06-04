let router = require("express").Router();
var { fetch } = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
const validate = require("validator");
router.use(require("express").json());

router.get("/", async (req, res) => {
 try {
  const key = await auth.getAccess(req.query.code);
  res.cookie('key', key, {
   maxAge: 30 * 3600 * 24 * 1000, //30days
   httpOnly: true,
   secure: true
  });
  const user = await auth.getUser(key).catch(e => {
   return res.redirect("/logout");
  });
  /* try{
    fetch(`https://discord.com/api/v7/`)
   }
   catch(e){
    console.log(e);
   }*/
  Users.findOne({ id: user.id }).then(result => {
   if (!result) {/*
    tempdis = user.discriminator;
    dis = "";
    while (3 - dis.length > 0) {
     dis += "0";
    }
    dis += tempdis;*/
    const User = new Users({
     id: user.id,
     username: user.username,
     discriminator: user.discriminator,
     email: user.emailId,
     avatar: (user.avatarHash) ? user.avatarHash : (user.discriminator % 5)
    }).save((err, userr) => {
     if (err) return console.log(err);
     fetch(`${process.env.DOMAIN}/api/client/log`, {
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify({
       "secret": process.env.SECRET,
       "title": `${userr.tag} account created!`,
       "desc": `${userr.tag} (${user.id}) has got a new account automatically on RDL after logining for the first time! So Hey new user **${user.username}**\nWelcome to Rovel Discord List!\nHere you can add your bots, servers, emojis, find your friends, and earn money to vote for your favourite bot!\nSo let's get started on your new journey on RDL!`,
        "owners": user.id,
       "img": user.avatarUrl(128),
       "url": `${process.env.DOMAIN}/users/${user.id}`
      })
     })
    });
   }
   if (result) {
    fetch(`${process.env.DOMAIN}/api/client/log`, {
     method: "POST",
     headers: {
      "content-type": "application/json"
     },
     body: JSON.stringify({
      "secret": process.env.SECRET,
      "title": `${result.tag} Logined!`,
      "desc": `Hello ${result.tag}!\nWelcome to RDL!`,
      "color": "#1FD816",
      "img": user.avatarUrl(128),
      "owners": user.id
     })
    });
     if(result.email==undefined){
      result.email=user.emailId;
      result.save();
     }
   }
  })
  if(req.cookies["return"]){
   try{
   await res.cookie("return", req.cookies["return"],{maxAge: 0});
   await res.redirect(req.cookies["return"]);
   } catch (e){}
  }
  else{
  await res.redirect("/");
  }
 } catch (e) {
  res.redirect("/");
  console.log(e);
 }
});
router.get("/key", async (req, res) => {
 res.json({ key: req.cookies['key'] || null });
});

router.get("/email", async(req, res)=>{
 if(req.query.email){
  Users.findOne({id: req.user.id}).then(user=>{
   if(user==undefined){
    res.json({err: "user_not_found"});
   }
   else{
    if(validate.isEmail(req.query.email)){
   user.email = req.query.email;
   user.save();
   res.json({email: user.email});
   }
    else{
     res.json({err: "invalid_email"});
    }
   }
  });
 }
 else{
  Users.findOne({id: req.user.id}).then(user=>{
   if(user==undefined){
    res.json({err: "user_not_found"});
   }
   else{
    res.json({email: user.email});
   }
  });
 }
});

router.get("/user", async (req, res) => {
 if (req.query.key || req.cookies['key']) {
  try {
   const user = await auth.getUser(req.query.key || req.cookies['key']).catch(e => {
    return res.json({ err: "invalid_key" });
   });
   await res.json(user);
  }
  catch {
   res.json({ error: "invalid_key" });
  }
 }
 else res.json({ error: "no_key" });
});
module.exports = router;