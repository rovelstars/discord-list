let Bots = require("@models/bots.js");
let Users = require("@models/users.js");
let BotAuth = require("@models/botauth.js");
const validator = require("validator");
const { owners } = require("../../data.js");
const passgen = require("@utils/passgen.js");
let { fetch } = require("rovel.js");
const schedule = require("node-schedule");
let router = require("express").Router();
router.use(require("express").json());
const coronaSanitizer = require("sanitize-html");
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = 0;
rule.hour = 12;
rule.minute = 0;
var gitregex = /(https?:\/\/)?github.com\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+/i;
const job = schedule.scheduleJob(rule, async function() {
 const hmm = await Bots.updateMany({}, { votes: 0 });
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

router.get("/", (req, res) => {
 if (req.query.q) {
  Bots.find({ $text: { $search: req.query.q } }, {_id: false}).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Bots.find({},{_id: false}).exec(function(err, bots) {
   if (err) return console.error(err);
   res.send(bots);
  })
 }
});

router.get("/info", (req, res) => {
 if (!req.query.code) return res.json({ err: "no_code" });
 BotAuth.findOne({ code: req.query.code }).then(ba => {
  if(!ba) return res.json({err: "no_bot_found"});
  Bots.findOne({ id: ba.id }).then(bot => {
   res.json(bot);
  });
 });
});

router.post("/:id/card", (req, res)=>{
 if(req.query.code){
  BotAuth.findOne({id: req.params.id, code: req.query.code}).then(au=>{
   if(!au) return res.json({err: "not_found"});
   else {
    Bots.findOne({id: req.params.id}).then(bot=>{
     if(!bot) return res.json({err: "bot_not_found"});
     else {
      if(req.body.img){
       if(!validator.isURL(req.body.img)) return res.json({err: "invalid_img"});
       else bot.card.img = req.body.img;
      }
      if(req.body.title){
       bot.card.title = req.body.title;
      }
      if(req.body.msg){
       bot.card.msg = req.body.msg;
      }
      bot.save();
      res.json({card: "updated"});
     }
    });
   }
  })
 }
 else return res.json({err: "no_code"});
});

router.get("/:id/vote", async (req, res) => {
 if (!req.query.key) res.json({ err: "not_logined" });
 else {
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(d => {
   if (d.err) return res.json({ err: "invalid_key" });
   if (!req.query.coins) return res.json({ err: "no_coins" });
   if (req.query.coins % 10 != 0) return res.json({ err: "coins_not_divisible" });
   const Vote = parseInt(req.query.coins) / 10;
     Users.findOne({ id: d.id }).then(use => {
      if(!use) return res.json({err: "no_user_found"});
      if(use.bal<req.query.coins) return res.json({err: "not_enough_coins"});
     Bots.findOne({ id: req.params.id }).then(async bot => {
      if(!bot) return res.json({err: "no_bot_found"});
      BotAuth.findOne({ id: req.params.id }).then(async ba => {
       use.bal = use.bal - req.query.coins;
      use.save();
       bot.votes = bot.votes + parseInt(Vote);
       bot.save();
       res.json({ bot });
       if (bot.webhook) {
        const hmm = JSON.stringify({
         "user": d,
         "coins": parseInt(req.query.coins),
         "votes": Vote,
         "currentVotes": bot.votes
        });
        fetch(`${bot.webhook}/vote?code=${ba.code}`, {
         method: "POST",
         headers: {
          "content-type": "application/json"
         },
         body: hmm
        }).then(r => r.json()).then(d => {
         if (!d.ok) {
          fetch(`${process.env.DOMAIN}/api/client/log`, {
           method: "POST",
           headers: {
            "content-type": "application/json"
           },
           body: JSON.stringify({
            "secret": process.env.SECRET,
            "title": `Failed to send data to ${bot.tag}`,
            "desc": `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
            "owners": bot.owners,
            "img": bot.avatarURL
           })
          })
         }
        }).catch(e => {
         fetch(`${process.env.DOMAIN}/api/client/log`, {
          method: "POST",
          headers: {
           "content-type": "application/json"
          },
          body: JSON.stringify({
           "secret": process.env.SECRET,
           "title": `Failed to send data to ${bot.tag}`,
           "desc": `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
           "owners": bot.owners,
           "img": bot.avatarURL
          })
         })
        })
       }
      });
     });
    });
  })
 }
})

router.post("/evaldb", (req, res) => {
 if (!req.query.key) return res.json({ err: "no_key" });
 fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(d => {
  if (d.err) return res.json({ err: "invalid_key" });
  if (!owners.includes(d.id)) return res.json({ err: "unauth" });
  try {
   eval(req.body.code);
  }
  catch (e) { res.json({ e }) };
 });
});

router.get("/:id/apikey", (req, res) => {
 if (!req.query.key) return res.json({ err: "no_key" });

 fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(d => {
  if (d.err) return res.json({ err: "invalid_key" });

  Bots.findOne({ id: req.params.id }).then(bot => {
   if(!bot) return res.json({err: "no_bot_found"});
   if (bot.owners.includes(d.id)) {
    const botauth = new BotAuth({
     id: req.params.id,
     code: passgen()
    }).save((err, auth) => {
     if (err) { //already there
      BotAuth.findOne({ id: req.params.id }).then(key => {
       if (req.query.regen == "true") {
        BotAuth.updateOne({ id: req.params.id }, { $set: { code: passgen() } }).then(BotAuth.findOne({ id: req.params.id }).then(key => res.json({ key })));
       }
       else res.json({ key });
      })
     }
     else res.json({ auth }); //not there and we made one
    })
   }
  });
 });
});
/*router.get("/:id/stats", (req, res) => {
 if (req.query.secret == process.env.SECRET) {
  Bots.findOne({ id: req.params.id }).then(bot => {
   bot.servers = req.query.servers;
   bot.save();
   res.json({ status: "updated" });
  })
 }
 else res.json({ err: "no_key" })
})*/
router.get("/:id", (req, res) => {
 Bots.findOne({ id: req.params.id },{_id: false}).then(bot => {
  res.json(bot);
 });
});

router.post("/:id/servers", (req, res)=>{
 if(!req.query.code) return res.json({err: "no_code"});
 if(isNaN(req.body.count)) return res.json({err: "NaN"});
 BotAuth.findOne({code: req.query.code, id: req.params.id}).then(b=>{
  if(!b) return res.json({err: "invalid_code"});
  Bots.findOne({id: b.id}).then(bot=>{
   bot.servers = req.body.count;
   bot.save();
   res.json({success: "true"});
  })
 })
});

router.delete("/:id", async (req, res) => {
   if (!req.query.key) return res.json({ err: "no_key" });

   await fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(async d => {
    if (d.err) return res.json({ err: "invalid_key" });

    await Bots.findOne({ id: req.params.id }).then(bot => {
     if(!bot) return res.json({err: "no_bot_found"});
     if (bot.owners.includes(d.id)) {
      Bots.deleteOne({ id: req.params.id }, function(err) {
       if (err) return res.json(err);
       res.json({ deleted: true });
       fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
         "Content-Type": "application/json"
        },
        body: JSON.stringify({
         "secret": process.env.SECRET,
         "desc": `Bot <@!${req.params.id}> has been deleted by <@!${d.id}>\nThe data deleted is:\n\`\`\`\n${JSON.stringify(bot)}\n\`\`\`\nIncase it was deleted accidentally, the above data may be added back again manually if the bot is added back to RDL`,
         "title": "Bot Deleted!",
         "color": "#ff0000",
         "owners": bot.owners,
         "img": bot.avatarURL,
         "url": `https://discord.rovelstars.com/`
        })
       });
      })
     }
     else return res.json({ err: "unauth" });
    });
   });
 });

router.get("/import/topgg/:id", (req, res) => {
 if (req.query.key) {
  var userid;
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(user => {
   userid = user.id;
   fetch(`https://top.gg/api/bots/${req.params.id}`, {
    method: "GET",
    headers: {
     "Authorization": `${process.env.TOPTOKEN}`
    }
   }).then(r => r.json()).then(bot => {
    if(bot.error) return res.json({err: bot.error});
    if (bot.owners.includes(userid)) {
     var abot = {
      id: bot.id,
      lib: (bot.lib=="")?null:bot.lib,
      prefix: bot.prefix,
      short: bot.shortdesc,
      desc: bot.longdesc,
      support: bot.support,
      owners: bot.owners,
      invite: bot.invite,
      github: bot.github,
      website: bot.website
     }
     fetch(`${process.env.DOMAIN}/api/bots/new`, {
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r => r.json()).then(d => {
      res.json(d);
     })
    }
    else {
     return res.json({ err: "unauth_owner" });
    }
   });
  })
 }
 else {
  res.json({ err: "no_key" });
 }
});

router.get("/import/del/:id", (req, res) => {
 if (req.query.key) {
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(user => {
   fetch(`https://api.discordextremelist.xyz/v2/bot/${req.params.id}`).then(r => r.json()).then(bot => {
    if (bot.owner.id == user.id) {
     var abot = {
      id: bot.bot.id,
      lib: (bot.bot.library=="")?null:bot.bot.library,
      prefix: bot.bot.prefix,
      short: bot.shortDesc,
      desc: bot.longDesc,
      owners: [bot.owner.id],
      invite: bot.links.invite,
      support: bot.links.support,
      github: bot.links.repo,
      website: bot.links.website
     }
     fetch(`${process.env.DOMAIN}/api/bots/new`, {
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r => r.json()).then(d => {
      res.json(d);
     })
    }
    else {
     return res.json({ err: "unauth_owner" });
    }
   });
  })
 }
 else {
  res.json({ err: "no_key" });
 }
});

router.get("/import/dbl/:id", (req, res) => {
 if (req.query.key) {
  fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(user => {
   fetch(`https://discordbotlist.com/api/v1/bots/${req.params.id}`).then(r => r.json()).then(bot => {
    if (bot.owner_id == user.id) {
     if (bot.server_invite == null) bot.server_invite = "602906543356379156";
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
     fetch(`${process.env.DOMAIN}/api/bots/new`, {
      method: "POST",
      headers: {
       "content-type": "application/json"
      },
      body: JSON.stringify(abot)
     }).then(r => r.json()).then(d => {
      res.json(d);
     })
    }
    else {
     return res.json({ err: "unauth_owner" });
    }
   })
  })
 }
 else res.json({ err: "no_key" });
});
router.post("/edit", async (req, res) => {
 let err;
 if (!req.body.id) return res.json({ err: "no_id" });
   Bots.findOne({ id: req.body.id }).then(async bot => {
    if(!err && !bot) err="not_bot_found";
    await fetch(`${process.env.DOMAIN}/api/auth/user?key=${req.query.key}`).then(r => r.json()).then(async d => {
     if (!err && d.err) err="invalid_key";
     if (!err && !bot.owners.includes(d.id)) "unauth"
    });
    if (!err && req.body.webhook) {
     if (!err && req.body.webhook !== bot.webhook) {
      if (!err && !validator.isURL(req.body.webhook))err="invalid_webhook";
      else bot.webhook = req.body.webhook;
     }
    }
    if (!err && req.body.owners) {
      req.body.owners = [...new Set(req.body.owners)];
     if (!err && (req.body.owners !== bot.owners)) {
      var cond = true;
      for (const owner of req.body.owners) {
       await fetch(`${process.env.DOMAIN}/api/client/mainserver/members/${owner}`).then(r => r.json()).then(d => {
        cond = (cond==true && d.condition==false)?false:true;
       })
      }
      if (!err && !cond) err="owner_not_in_server";
      if (!err && cond) bot.owners = req.body.owners;
     }
    }
    if (!err && req.body.desc) {
     if (!err && req.body.desc !== bot.desc) {
      if (!err && req.body.desc.length < 100) err="invalid_desc";
      else {
       bot.desc = coronaSanitizer(req.body.desc, {
        allowedTags: coronaSanitizer.defaults.allowedTags.concat(['discord-message', 'discord-messages','img' ,'iframe', 'style']),
        allowVulnerableTags: true,
        allowedAttributes: {
      '*': ["*"]
     }
       });
      }
     }
    }
    if (!err && req.body.short) {
     if (!err && req.body.short !== bot.short) {
      if (req.body.short.length < 11)err="invalid_short";
      if (!err && req.body.short.length > 150) {
       req.body.short = req.body.short.slice(0, 147) + "...";
      }
      bot.short = req.body.short;
     }
    }
    if (!err && req.body.support) {
     if (req.body.support !== bot.support) {
      req.body.support = req.body.support.replace("discord.gg","");
      req.body.support.replace("https://","");
      if(req.body.support!==""){
      fetch(`https://discord.com/api/v7/invites/${req.body.support}`).then(r => r.json()).then(d => {
        if ((d.code == 10006 || d.code == 0) || d.code != req.body.support) err="invalid_support";
       })
     }
     else bot.support = (req.body.support=="")?null:req.body.support;
    }}
    if (!err && req.body.lib) {
     if (req.body !== bot.lib) {
      if (req.body.lib.length > 11) err="invalid_lib";
      else bot.lib = req.body.lib;
     }
    }
    if (!err && req.body.invite) {
     if (req.body.invite !== bot.invite) {
      if (!validator.isURL(req.body.invite)) err="invalid_invite";
      else bot.invite = req.body.invite;
     }
    }
    if (!err && req.body.prefix) {
     if (req.body.prefix !== bot.prefix) {
      bot.prefix = req.body.prefix;
     }
    }
    if (!err && req.body.bg) {
     if (req.body.bg !== bot.bg) {
      if (!validator.isURL(req.body.bg)) err="invalid_bg";
      else bot.bg = (req.body.bg=="")?null:req.body.bg;
     }
    }
    if(!err && req.body.github){
     if(req.body.github!==bot.github){
      if(!req.body.github.match(gitregex)) err="invalid_github";
      else bot.github = (req.body.github=="")?null:req.body.github;
     }
    }
    if(!err){
    await bot.save();
    await res.json(bot);
    }
    else{
     res.json({err});
    }
   });
});
router.post("/new", async (req, res) => {
 let err;
 Bots.findOne({ id: req.body.id }).then(async result => {
  if (result) err= "bot_already_added";
  if(!err){
   if(req.body.github=="") req.body.github = null;
    if(req.body.bg=="") req.body.bg= null;
    if(req.body.support=="") req.body.support = null;
    if(req.body.donate=="") req.body.donate = null;
  }
  if (!err && !result) {
   try {
    if (!err && !req.body.id) err= "no_id";
    await fetch(`https://discord.com/api/v7/users/${req.body.id}`, {
     headers: {
      "Authorization": `Bot ${process.env.TOKEN}`
     }
    }).then(r => r.json()).then(async user => {
     if (!err && (user.bot == undefined)) err= "cannot_add_user"
     if (!err && (user.code == 10013)) err= "cannot_add_invalid_user"
    if (!err && req.body.bg) {
     if (!validator.isURL(req.body.bg)) err= "invalid_bg"
    }
    if (!err && !req.body.owners) err= "no_owners"

    req.body.owners = [...new Set(req.body.owners)];

    if (!err && !req.body.short) err= "no_short"
    if (!err && (req.body.short.length < 11)) err= "invalid_short"
    if (!err && (req.body.short.length > 150)) {
     req.body.short = req.body.short.slice(0, 147) + "...";
    }
    if(!err && req.body.webhook){
    if (!validator.isURL(req.body.webhook)) err= "invalid_webhook"
    }
    if (!err && !validator.isURL(req.body.invite)) err= "invalid_invite"
    if(!err && req.body.donate){
     if(!validator.isURL(req.body.donate)) err="invalid_donate"
    }
    if (!err && !req.body.desc) err="no_desc"
    if (!err && req.body.lib.length > 11) err="invalid_lib"
    if (!err && (req.body.desc.length < 100)) err="invalid_desc"
    if (!err && !req.body.prefix) err= "no_prefix"
    if (!err && !req.body.invite) err= "no_invite"
    if (!err && req.body.support){
    req.body.support = req.body.support.replace("discord.gg/","");
    req.body.support = req.body.support.replace("discord.com/invite/","");
    req.body.support.replace("https://","");
    if(!err){
     fetch(`https://discord.com/api/v7/invites/${req.body.support}`).then(r => r.json()).then(d => {
      if ((d.code == 10006 || d.code == 0) || d.code != req.body.support) err= "invalid_support"
     })}
    if(!err && (req.body.support.length>=18)) err: "invalid_support"
    }
    if(!err && req.body.github){
     if(!req.body.github.match(gitregex)) err="invalid_github"
    }
    if(!err && req.body.desc){
    req.body.desc = coronaSanitizer(req.body.desc, {
     allowedTags: coronaSanitizer.defaults.allowedTags.concat(['discord-message', 'discord-messages','img' , 'iframe', 'style']),
     allowVulnerableTags: true,
     allowedAttributes: {
      '*': ["*"]
     }
    });}
    for (const owner of req.body.owners) {
     await fetch(`${process.env.DOMAIN}/api/client/mainserver/members/${owner}`).then(r => r.json()).then(d => {
      if(!err && !d.condition){
      err="owner_not_in_server"
      }
     })
    }
    if (!err) {
     fetch(`https://discord.com/api/v7/users/${req.body.id}`, {
      headers: {
       "Authorization": `Bot ${process.env.TOKEN}`
      }
     }).then(r => r.json()).then(info => {
      if (!info.avatar) {
       info.avatar = (info.discriminator % 5).toString();
      }
      const bot = new Bots({
       id: req.body.id,
       webhook: req.body.webhook,
       username: info.username,
       discriminator: info.discriminator,
       avatar: info.avatar,
       owners: req.body.owners,
       short: req.body.short,
       desc: req.body.desc,
       prefix: req.body.prefix,
       verified: false,
       lib: req.body.lib,
       support: (req.body.support=="")?null:req.body.support,
       bg: (req.body.bg)?null:req.body.bg,
       github: (req.body.github=="")?null:req.body.github,
       website: (req.body.website=="")?null:req.body.website,
       donate: (req.body.donate=="")?null:req.body.donate,
       invite: req.body.invite
      }).save((err, bot) => {
       if (err) { console.log("err" + err); return res.send({ err }); }
       if (!err) {
        res.send({ success: true });
        fetch("https://discord.rovelstars.com/api/client/log", {
         method: "POST",
         headers: {
          "Content-Type": "application/json"
         },
         body: JSON.stringify({
          "secret": process.env.SECRET,
          "img": bot.avatarURL,
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
    if(err){
     res.json({err});
    }
   });
   }
   catch (e) {
    res.json({ err: e });
   }
  }
 });

});
module.exports = router;