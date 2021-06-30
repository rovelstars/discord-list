require("module-alias/register");
const v = process.version.slice(1,3);
if(v<16){
 console.error("[ERROR] Node.js v16 or above is required.");
 process.exit(1);
}
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
globalThis.app = app;
gloabalThis.port = port;

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

require("./build/start.js");

require("./build/run.js");