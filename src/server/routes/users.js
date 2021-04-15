let router = require("express").Router();
var {fetch} = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
router.use(require("express").json());

router.get("/", (req, res) => {
 if (req.query.q) {
  const q = decodeURI(req.query.q);
  Users.find({ $text: { $search: q } },{_id: false}).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Users.find({},{_id: false}).exec(function(err, users) {
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
       var users = [{
        id: resp.user.user_id,
        username: resp.user.username,
        avatarURL: resp.user.avatar_url,
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
     temp = {
      id: data.user_id,
      username: data.username,
      avatarURL: data.avatar_url,
      discriminator: data.discriminator,
      tag: data.username+"#"+data.discriminator
     };
     users.push(temp);
    });
    await res.json(users);
   }
   }
   else return res.json({err: `failed`, logs: resp});
  })
 }
 else return res.json({err: "no_query"});
});

router.get("/:id", (req, res) => {
 Users.findOne({ id: req.params.id },{_id: false}).then(user => {
  res.json(user);
 });
});
router.get("/:id/delete", (req, res)=>{
 if(!req.query.key) return res.json({err: "no_key"});
 else {
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(d => {
   if (d.err) return res.json({ err: "invalid_key" });
   else {
    if(d.id == req.params.id){
     Users.findOne({id: d.id}).then(user=>{
      if(!user) return;
      Users.deleteOne({id: user.id}).then(r=>{});
      res.json({ deleted: true });
       fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `${user.tag} deleted their account!\nThe data deleted is:\n\`\`\`\n${JSON.stringify(user)}\n\`\`\`\nIncase it was deleted accidentally, the above data may be added back again manually if the user is added back to RDL`,
         "title": "User Deleted!",
         "color": "#ff0000",
         "owners": user.id,
         "img": user.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
     })
    }
   }
  });
 }
})
router.get("/coins", (req, res)=>{
 Users.findOne({id: "602902050677981224"}).then(user=>{
  user.bal+=10;
  user.save();
  res.json({bal: user.bal});
 })
})
module.exports = router;