require("module-alias/register");
var rovel = require("rovel.js");
rovel.env.config();
const mongoose = require('mongoose');
(async () => {
await mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

await db.on('error', console.error.bind(console, 'connection error:'));

await db.once('open', function() {
  console.log("[DB] We're connected to database!");
});
const {app, port} = require("@server/app.js");
const {client} = require("@bot/index.js");
await client.login(process.env.TOKEN);
await app.listen(port, () => {
 console.log(`[SERVER] Started on port:${port}`);
})
});