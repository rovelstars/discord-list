var rovel = require("rovel.js");
rovel.env.config();
const mongoose = require('mongoose');
//rovel.execarg("node","bot.js");
 
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
module.exports = {app};
//rovel.execarg("node","app.js");

app.listen(port, () => {
  console.log(`[SERVER] Started on PORT:${port}`)
});