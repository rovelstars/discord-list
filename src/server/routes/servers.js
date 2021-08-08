let router = require("express").Router();
var {fetch} = require("rovel.js");
router.use(require("express").json());
const validator = require("validator");
const coronaSanitizer = require("sanitize-html");

router.get("/", (req, res) => {
 if (req.query.q) {
  Cache.models.servers.find({ $text: { $search: req.query.q } },{_id: false}).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Cache.models.servers.find({},{_id: false}).exec(function(err, servers) {
   if (err) return console.error(err);
   res.send(servers);
  })
 }
});

router.get("/:id", (req, res)=>{
 Cache.models.servers.findOne({ id: req.params.id }, { _id: false }).then(server => {
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
  guild.invites.fetch().then(invs=>{
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

router.post("/:id/edit",(req, res)=>{
 let err;
 if (!req.body.id) return res.json({ err: "no_id" });
 Cache.models.servers.findOne({ id: req.body.id }).then(async server => {
  if (!err && !server) err = "server_not_found";
  await fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(async d => {
   if (!err && d.err) err = "invalid_key";
   if (!err && (servers.owners!=d.id) && !privatebot.owners.includes(d.id)) err = "unauth"
   if(!err && (req.body.short)){
     if (req.body.short !== server.short) {
    if (req.body.short.length < 11) err = "invalid_short";
    if (!err && req.body.short.length > 150) {
     req.body.short = req.body.short.slice(0, 147) + "...";
    }
    server.short = req.body.short;
   }
   }
   if(!err && (req.body.desc)){
    if(req.body.desc!==server.desc){
     if(req.body.desc.length<200) err="invalid_desc";
     if(!err){
      server.desc = coronaSanitizer(req.body.desc, {
      allowedTags: coronaSanitizer.defaults.allowedTags.concat(['discord-message', 'discord-messages', 'img', 'iframe', 'style', 'h1', 'h2', 'link', 'mark', 'svg', 'span']),
      allowVulnerableTags: true,
      allowedAttributes: {
       '*': ["*"]
      }
     });
     }
    }
   }
   if(!err && (req.body.bg)){
    if(req.body.bg!==server.bg){
     if(req.body.bg=="") server.bg = null;
     else if(!validator.isURL(req.body.bg)) err="invalid_bg"
    }
   }
   if(err){
    res.json({err});
   }
   if(!err){
    res.json({success: true});
    server.save();
   }
  });
 });
});

module.exports = router;