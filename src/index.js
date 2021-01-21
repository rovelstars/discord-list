let rovel = require("rovel.js");
rovel.env.config();
const mongoose = require('mongoose');
const Discord = require("discord.js");
 
 require("./bot.js");
 
mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
  console.log("[DB] We're connected to database!");
});

const port = process.env.PORT || 3000;
var express = require("express");
var compression = require("compression");
var app = express();
app.use(compression());

require("./app.js");

app.listen(port, () => {
  console.log(`[SERVER] Started on PORT:${port}`)
})
client.login(process.env.TOKEN);

module.exports = {
 app: app,
rovel: rovel,
};