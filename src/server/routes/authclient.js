let router = require("express").Router();
var {fetch} = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
router.use(require("express").json());

router.get("/", async (req, res)=>{
    const key = await auth.getAccess(req.query.code);
    res.cookie('key', key, {
     maxAge: 86400 * 1000 * 90,
     httpOnly: true,
     secure: true
    });
    const user = await auth.getUser(key);
    Users.isthere({id: user.id}).then(result=>{
     if(!result){
      const User = new Users({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: (user.avatarHash)?user.avatarHash:(user.discriminator % 5)
     }).save((err, userr)=>{
      if(err) return console.log(err);
      fetch(`${process.env.DOMAIN}/api/client/log${userr.id}`,{
       method: "POST",
       headers: {
        "content-type": "application/json"
       },
       body: JSON.stringify({
        "secret": process.env.SECRET,
        "title": `${userr.tag} account created!`,
        "desc": `${userr.tag} (${user.id}) has got a new account automatically on RDL after logining for the first time! So Hey new user **${user.username}**\nWelcome to Rovel Discord List!\nHere you can add your bots, servers, emojis, find your friends, and earn money to vote for your favourite bot!\nSo let's get started on your new journey on RDL!`,
        "owners": user.id,
        "img": user.avatarUrl,
        "url": `${process.env.DOMAIN}/users/${user.id}`
       })
      })
     });
     }
    })
     
  fetch(`${process.env.DOMAIN}/api/client/log`, {
   method: "POST",
   headers: {
    "content-type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "title": `${user.tag} Logined!`,
    "desc": `Hello ${user.tag}!\nWelcome to RDL!`,
    "color": "#1FD816",
    "img": user.avatarUrl(128),
    "owners": user.id
   })
  })
    await res.redirect(process.env.DOMAIN);
});
router.get("/key", async (req, res)=>{
 res.json({key: req.cookies['key'] || null});
});
router.get("/user", async (req, res)=>{
 if(req.query.key || req.cookies['key']){
  try {
  const user = await auth.getUser(req.query.key || req.cookies['key']).catch(e=>{
   return res.json({err: "invalid_key"});
  });
  await res.json(user);
 }
  catch{
   res.json({error: "invalid_key"});
  }
 }
 else res.json({error: "no_key"});
});
module.exports = router;