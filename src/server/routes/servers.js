let router = require("express").Router();
var {fetch} = require("rovel.js");
router.use(require("express").json());

router.get("/", (req, res) => {
 if (req.query.q) {
  Servers.find({ $text: { $search: req.query.q } },{_id: false}).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Servers.find({},{_id: false}).exec(function(err, servers) {
   if (err) return console.error(err);
   res.send(servers);
  })
 }
});

router.get("/:id", (req, res)=>{
 Servers.findOne({ id: req.params.id }, { _id: false }).then(server => {
  res.json({server});
 });
})

router.get("/:id/invite", (req, res)=>{
 const guild = globalThis.publicbot.guilds.cache.get(req.params.id);
 if(!guild){
  res.json({err: "guild_not_found"});
 }
 else{
  if(guild.me.hasPermission("MANAGE_GUILD")){
  guild.fetchInvites().then(invs=>{
  invs = invs.map(invm=>invm.code);
  shuffle(invs);
  const code = invs[0] || "not_found";
  if(code!="not_found"){
  res.json({code})
  }
  else{
   if(guild.me.hasPermission("CREATE_INSTANT_INVITE")){
   var chx = guild.channels.cache.filter(chx => (chx.type === "text" && !chx.nsfw)).find(x => x.position === 0);
   chx.createInvite().then(inv=>{
    res.json({code: inv.code});
   })
  }
  else{
   res.json({err: "no_perms"});
  }
  }
});
 }
 else{
  if(guild.me.hasPermission("CREATE_INSTANT_INVITE")){
   var chx = guild.channels.cache.filter(chx => (chx.type === "text" && !chx.nsfw)).find(x => x.position === 0);
   chx.createInvite().then(inv=>{
    res.json({code: inv.code});
   })
  }
  else{
   res.json({err: "no_perms"});
  }
 }
 }
});

module.exports = router;