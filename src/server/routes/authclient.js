let router = require("express").Router();
let auth = require("@utils/auth.js");
router.use(require("express").json());

router.get("/", async (req, res)=>{
    const key = await auth.getAccess(req.query.code);
    res.cookie('key', key, {
     maxAge: 86400 * 1000 * 90,
     httpOnly: true,
     secure: true
    });
    const user = await auth.getUser(key);
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