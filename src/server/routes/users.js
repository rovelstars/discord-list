let router = require("express").Router();
var {fetch} = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
router.use(require("express").json());

router.get("/", (req, res) => {
 if (req.query.q) {
  const q = decodeURI(req.query.q);
  Users.find({ $text: { $search: q } }).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Users.find(function(err, users) {
   if (err) return console.error(err);
   res.send(users);
  })
 }
});
router.get("/all", async (req, res)=>{
 if(req.query.q){
  await fetch(`https://api.dscrd.info/search/${req.query.q}`).then(r=>r.json()).then(async resp=>{
   if(resp.success){
    if(resp.members.length==0){//need to perform id fetch
     await fetch(`https://api.dscrd.info/id/${req.query.q}`).then(r=>r.json()).then(async resp=>{
      if(resp.success){
       var hash = resp.user.avatar_url.replace(`https://cdn.discordapp.com/avatars/${data.username}/`, "");
       hash = hash.replace("?size=1024", "");
       var users = [{
        id: resp.user.user_id,
        username: resp.user.username,
        avatarURL: resp.user.avatar_url,
        avatar: hash,
        discriminator: resp.user.discriminator,
        tag: resp.user.username+"#"+resp.user.discriminator
      }];
      res.json(users);
      } else {
       return res.json({err: "not_found"});
      }
     });
    }
    else {
    var users = [];
    var temp;
    const members = resp.members;
    await members.forEach((data, index)=>{
     var hash = data.avatar_url.replace(`https://cdn.discordapp.com/avatars/${data.username}/`, "");
     hash = hash.replace("?size=1024", "");
     temp = {
      id: data.user_id,
      username: data.username,
      avatarURL: data.avatar_url,
      avatar: hash,
      discriminator: data.discriminator,
      tag: data.username+"#"+data.discriminator
     };
     users.push(temp);
    });
    await res.json(users);
   }
   }
   else return res.json({err: "failed"});
  })
 }
 else return res.json({err: "no_query"});
});
router.get("/:id", (req, res) => {
 Users.findOne({ id: req.params.id }).then(user => {
  res.json(user);
 });
});
router.get("/coins", (req, res)=>{
 Users.findOne({id: "602902050677981224"}).then(user=>{
  user.bal+=10;
  user.save();
  res.json({bal: user.bal});
 })
})
module.exports = router;