const rovel = require("rovel.js");
console.clear();
rovel.env.config();
const mongoose = require('mongoose');
const Discord = require("discord.js");
 let client = new Discord.Client();
 
 client.once("ready", () => {
  console.log("[BOT] online"+` as ${client.user.username+"#"+client.user.tag}`);
  client.user.setPresence({ activity: { name: 'Watching RDL' }, status: 'idle' });
 })
 
mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
  console.log("[DB] We're connected! to "+process.env.DB);
});

const port = process.env.PORT || 3000;
var express = require("express");
var app = express();

app.get("*", (req, res)=>{
 res.send("RDL under Development (⌐■-■)\nPlease come back later. Until then, join our discord server https://discord.gg/953XCpHbKF");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
client.login(process.env.TOKEN);