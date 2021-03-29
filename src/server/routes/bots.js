let Bots = require("@models/bots.js");
let BotAuth = require("@models/botauth.js");
const {owners} = require("../../data.js");
const passgen = require("@utils/passgen.js");
let {fetch} = require("rovel.js");
const schedule = require("node-schedule");
let router = require("express").Router();
router.use(require("express").json());
const coronaSanitizer = require("sanitize-html");
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = 0;
rule.hour = 12;
rule.minute = 0;

const job = schedule.scheduleJob(rule, async function(){
 const hmm = await Bots.updateMany({}, {votes: 0});
  fetch(`${process.env.DOMAIN}/api/client/log`, {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "channel": "775225719743053844",
    "desc": `It is now the Scheduled Time!\nThe Votes of all (${hmm.nModified}) bots will now be **RESETED**!\nStart voting your bots again to reach the top of the Leaderboard!`,
    "title": "Votes Reseted!",
    "color": "#ff0000"
   })
  });
});

router.get("/", (req, res)=>{
 if(req.query.q){
  const q = decodeURI(req.query.q);
  Bots.find({$text: {$search: q}}).exec((err, doc)=>{
   if(err) return res.json({err});
   res.json(doc);
  })
 }
 else {
 Bots.find(function (err, bots){
  if (err) return console.error(err);
  res.send(bots);
 })
 }
});

router.get("/test", async (req, res)=>{
 const bot = await Bots.findOne();
 await console.log(bot.user);
 await res.json(bot.user);
})
router.post("/evaldb", (req, res)=>{
 if(!req.query.key) return res.json({err: "no_key"});
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(d=>{
  if(d.err) return res.json({err: "invalid_key"});
  if(!owners.includes(d.id)) return res.json({err: "unauth"});
  try{
   eval(req.body.code);
  }
  catch(e){res.json({e})};
  });
});

router.get("/:id/apikey", (req, res)=>{
  if(!req.query.key) return res.json({err: "no_key"});
 
 fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(d=>{
  if(d.err) return res.json({err: "invalid_key"});
  
  Bots.findOne({id: req.params.id}).then(bot=>{
   if(bot.owners.includes(d.id)){
    const botauth = new BotAuth({
     id: req.params.id,
     code: passgen()
    }).save((err, auth)=>{
     if(err){//already there
      BotAuth.findOne({id: req.params.id}).then(key=>{
       if(req.query.regen=="true"){
        BotAuth.updateOne({ id: req.params.id }, { $set: { code: passgen() } }).then(BotAuth.findOne({id: req.params.id}).then(key=>res.json({key})));
       }
       else res.json({key});
      })
     }
     else res.json({auth}); //not there and we made one
    })
}});
});
});
router.get("/:id/stats", (req, res)=>{
 if(req.query.secret == process.env.SECRET){
  Bots.findOne({id: req.params.id}).then(bot=>{
   bot.servers = req.query.servers;
   bot.save();
   res.json({status: "updated"});
  })
 }
 else res.json({err: "no_key"})
})
router.get("/:id", (req, res)=>{
 Bots.findOne({id: req.params.id}).then(bot=>{
  res.json(bot);
 });
});
router.get("/:id/added", async (req, res)=>{
 if(req.query.secret === process.env.SECRET){
  var bot = await Bots.findOne({id: req.params.id});
  bot.added = true;
  await bot.save();
  res.send(`${bot.added}`);
  fetch("https://discord.rovelstars.com/api/client/log", {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({
    "secret": process.env.SECRET,
    "desc": `Bot <@!${req.params.id}> has been added to this server and is getting listed on RDL!`,
    "title": "Bot Listed!",
    "color": "#FEF40E",
    "owners": bot.owners,
    "url": `${process.env.DOMAIN}/api/bots/${bot.id}`
   })
  })
 }
});
router.delete("/:id", (req, res)=>{
 try{
 if(!req.query.key) return res.json({err: "no_key"});
 
 fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(d=>{
  if(d.err) return res.json({err: "invalid_key"});
  
  Bots.findOne({id: req.params.id}).then(bot=>{
   if(!bot) return res.json({err: "already_deleted"});
   if(bot.owners.includes(d.id)){
   Bots.deleteOne({id: req.params.id}, function (err) {
  if (err) return res.json(err);
  res.json({deleted: true});
  fetch("https://discord.rovelstars.com/api/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "desc": `Bot <@!${req.params.id}> has been deleted by <@!${d.id}>`,
   "title": "Bot Deleted!",
   "color": "#ff0000",
   "owners": bot.owners,
   "url": `https://discord.rovelstars.com/`
  })
 });
 })
  }
  else return res.json({err: "unauth"});
  });
 });
 } catch {
  res.json({err: "bot_already_deleted"});
 }
});

router.get("/import/topgg/:id", (req, res)=>{
 if(req.query.key){
  var userid;
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(user=>{
   userid = user.id;
   fetch(`https://top.gg/api/bots/${req.params.id}`, {
    method: "GET",
    headers: {
     "Authorization": `${process.env.TOPTOKEN}`
    }
   }).then(r=>r.json()).then(bot=>{
    if(bot.owners.includes(userid)){
     var abot={
     id: bot.id,
     lib: bot.lib,
     prefix: bot.prefix,
     short: bot.shortdesc,
     desc: bot.longdesc,
     support: bot.support,
     owners: bot.owners,
     invite: bot.invite,
     github: bot.github,
     website: bot.website
     }
     fetch(`${process.env.DOMAIN}/api/bots/new`,{
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r=>r.json()).then(d=>{
      res.json(d);
     })
    }
    else{
     return res.json({err: "unauth_owner"});
    }
   });
  })
 }
 else{
  res.json({err: "no_key"});
 }
});

router.get("/import/del/:id", (req, res)=>{
 if(req.query.key){
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(user=>{
   fetch(`https://api.discordextremelist.xyz/v2/bot/${req.params.id}`).then(r=>r.json()).then(bot=>{
    if(bot.owner.id==user.id){
     var abot={
     id: bot.bot.id,
     lib: bot.bot.library,
     prefix: bot.bot.prefix,
     short: bot.shortDesc,
     desc: bot.longDesc,
     owners: [bot.owner.id],
     invite: bot.links.invite,
     support: bot.links.support,
     github: bot.links.repo,
     website: bot.links.website
     }
     fetch(`${process.env.DOMAIN}/api/bots/new`,{
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r=>r.json()).then(d=>{
      res.json(d);
     })
    }
    else{
     return res.json({err: "unauth_owner"});
    }
   });
  })
 }
 else{
  res.json({err: "no_key"});
 }
});

router.get("/import/dbl/:id", (req, res)=>{
 if(req.query.key){
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r=>r.json()).then(user=>{
   fetch(`https://discordbotlist.com/api/v1/bots/${req.params.id}`).then(r=>r.json()).then(bot=>{
    if(bot.owner_id==user.id){
     if(bot.server_invite==null) bot.server_invite="602906543356379156";
     var abot = {
      id: bot.id,
      lib: "discord.js",
      prefix: bot.prefix,
      short: bot.short_description,
      desc: bot.long_description,
      owners: [bot.owner_id],
      invite: bot.oauth_url,
      support: bot.server_invite,
      website: bot.website
     };
     fetch(`${process.env.DOMAIN}/api/bots/new`,{
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r=>r.json()).then(d=>{
      res.json(d);
     })
    }
    else{
     return res.json({err: "unauth_owner"});
    }
   })
  })
 }
 else res.json({err: "no_key"});
});

router.post("/new", async (req, res)=>{
 try{
 //validator start
 
 if(!req.body.id) return res.json({err: "no_id"});
 fetch(`https://discord.com/api/v7/users/${req.body.id}`,{
  headers: {
   "Authorization": `Bot ${process.env.TOKEN}`
  }
 }).then(r=>r.json()).then(user=>{
  if(user.bot==undefined) return res.json({err: "cannot_add_user"});
  if(user.code == 10013) return res.json({err: "cannot_add_invalid_user"});
 })
 if(!req.body.owners) return res.json({err: "no_owners"});
 if(!req.body.short) return res.json({err: "no_short"});
 if(req.body.short.length < 11) return res.json({err: "invalid_short"});
 if(req.body.short.length > 150){
  req.body.short = req.body.short.slice(0, 147) + "...";
 }
 if(!req.body.desc) return res.json({err: "no_desc"});
 if(req.body.length>11) return res.json({err: "invalid_lib"});
 if(req.body.desc.length < 100) return res.json({err: "invalid_desc"});
 if(!req.body.prefix) return res.json({err: "no_prefix"});
 if(!req.body.invite) return res.json({err: "no_invite"});
 if(!req.body.support) return res.json({err: "no_support"});
 if(!req.body.support.length > 18){
   fetch(`https://discord.com/api/v7/invites/${req.body.support}`).then(r=>r.json()).then(d=>{
    console.log(d);
  if((d.code == 10006 || d.code == 0 ) || d.code != req.body.support) return res.json({err: "invalid_support"});
  else req.body.support = d.guild.id;
 })
 }
 req.body.desc = coronaSanitizer(req.body.desc, {
  allowedTags: coronaSanitizer.defaults.allowedTags.concat(['discord-message', 'iframe', 'style']),
  allowVulnerableTags: true
 });
 var cond = true;
 for(const owner of req.body.owners){
  await fetch(`${process.env.DOMAIN}/api/client/mainserver/members/${owner}`).then(r=>r.json()).then(d=>{
   cond = d.condition;
  })
 }
 //end of validation
 if(cond){
  fetch(`https://discord.com/api/v7/users/${req.body.id}`,{
  headers: {
   "Authorization": `Bot ${process.env.TOKEN}`
  }
 }).then(r=>r.json()).then(info=>{
  if(!info.avatar){
   info.avatar = this.discriminator % 5;
  }
  const bot = new Bots({
 id: req.body.id,
 username: info.username,
 discriminator: info.discriminator,
 avatar: info.avatar,
 owners: req.body.owners,
 short: req.body.short,
 desc: req.body.desc,
 prefix: req.body.prefix,
 verified: false,
 lib: req.body.lib,
 support: req.body.support,
 bg: req.body.bg,
 github: req.body.github,
 website: req.body.website,
 donate: req.body.donate,
 invite: req.body.invite
 }).save((err, bot)=>{
  if(err){ console.log("err"+err); return res.send({err});}
  if(!err){ 
   res.send({botAdded: true});
  fetch("https://discord.rovelstars.com/api/client/log", {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "secret": process.env.SECRET,
   "img": `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png?size=512`,
   "desc": `**${info.username}** has been added by <@!${bot.owners[0]}>\nInfo:\n\`\`\`\n${bot.short}\n\`\`\``,
   "title": "New Bot Added!",
   "color": "#31CB00",
   "owners": bot.owners,
   "url": `https://discord.rovelstars.com/api/bots/${bot.id}`
  })
 });
  }
 });
 })
 }
 else res.json({err: "owner_not_in_server"});
 }
 catch(e){
  res.json({err: e});
 }
});
module.exports = router;