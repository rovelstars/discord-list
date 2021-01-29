let Bots = require("@models/bots.js");
let {client} = require("@bot/index.js");
let router = require("express").Router;
router.get("/new", (req, res)=>{
 const bot = new Bots({
  _id: 603213294265958400,
 owners: [602902050677981224],
 short: "works",
 desc: "hmm testing"
 });
 
 bot.save((err, bot)=>{
  if(err) throw err;
  client.channels.cache.get("804250610571673600").send(`**New Bot Added!**\nBot: <@!${bot._id}>\nOwner: <@!${bot.owners[0]}>`);
 })
});
module.exports = router;