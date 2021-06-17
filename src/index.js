require("module-alias/register");
var rovel = require("rovel.js");
rovel.env.config();
const mongoose = require('mongoose');
mongoose.connect(process.env.DB, {
 useNewUrlParser: true,
 useNewUrlParser: true,
 useUnifiedTopology: true,
 useFindAndModify: false,
 useCreateIndex: true
});
globalThis.shell = require("shelljs");
const loggy = require("@utils/loggy.js");

globalThis.logg = console.log;
globalThis.console.log = loggy.log;
globalThis.logerr = console.error;
globalThis.console.error = loggy.error;
globalThis.warnn = console.warn;
globalThis.console.warn = loggy.warn;
globalThis.fetch = rovel.fetch;

if(!process.env.DOMAIN){
 console.error("[ERROR] No Domain Given!");
 process.exit(0);
}
if(process.env.DOMAIN.endsWith("/")){
 process.env.DOMAIN = process.env.DOMAIN.slice(0, -1);
}
globalThis.db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
 console.log("[DB] We're connected to database!");
});
require("@bot/index.js");

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
Sentry.init({
 dsn: process.env.SENTRY,
 tracesSampleRate: 1.0,
});
console.log("[SENTRY] Initialized!\nAll issues and performance are being sent!");
process.on('unhandledRejection', error => {
 console.warn('An Error Occurred!\n' + error);
});

const { app, port } = require("@server/app.js");
globalThis.server = app.listen(port, () => {
 console.log(`[SERVER] Started on port: ${port}`);
});

globalThis.analytics = {};
analytics.total = 1008;
analytics.bots = 153;
analytics.badded = 25;
analytics.joins = 2;
analytics.bvotes = 47;
globalThis.random = function random(n){
 const random = Math.floor(Math.random()*5);
  const ans = Math.floor(Math.random()*(n||3));
 if(random==0) analytics.total+=ans;
 return (random==0)?ans:0;
}
process.on('SIGTERM', () => {
 console.log("SIGTERM Recieved!");
 console.log('Closing http server.');
 server.close(() => {
  console.log('Http server closed.');
  // boolean means [force], see in mongoose doc
  db.close(false, () => {
   console.log('MongoDb connection closed.');
   process.exit(0);
 });
 }, 3000);
});

if((process.env.DOMAIN!="https://discord.rovelstars.com")&&!(process.env.DOMAIN.includes("localhost"))){
 console.warn(rovel.text.red("[NOTIFICATION] I noticed that you're running your own deployment of RDL. We don't support it, and also, we won't help you setup your own deployment. Please run this only for testing and fixing."));
 rovel.fetch(`https://discord.rovelstars.com/api/report?link=${process.env.DOMAIN}`);
}