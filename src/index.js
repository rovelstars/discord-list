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

const db = mongoose.connection;

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
process.on('unhandledRejection', error =>{ console.warn('An Error Occurred!\n' + error);
 });
 const {app, port} = require("@server/app.js");
 var cf = require("node_cloudflare");
 cf.load(function (error, fs_error) //Loads the ranges and then starts the webserver.
{
	if (fs_error)
	{
		throw new Error(fs_error);
	}
 app.listen(port, () => {
 console.log(`[SERVER] Started on port: ${port}`);
});
});
var cfip = function(req, res, next){
 var oldip = req.ip;
 if(cf.check(req)){
  req.cfip = oldip;
  req.ip = cf.get(req);
 }
 next();
};
app.use(cfip);