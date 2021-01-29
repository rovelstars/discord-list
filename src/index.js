require("module-alias/register");
var rovel = require("rovel.js");
rovel.env.config();
const mongoose = require('mongoose');
mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("[DB] We're connected to database!");
});
const {app, port} = require("@server/app.js");
const {client} = require("@bot/index.js");
app.listen(port, () => {
 console.log(`[SERVER] Started on port:${port}`);
});

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
Sentry.init({
  dsn: process.env.SENTRY,
  tracesSampleRate: 1.0,
});
/*
const transaction = Sentry.startTransaction({
  op: "test",
  name: "My First Test Transaction",
});*/
console.log("[SENTRY] Initialized!\nAll issues and performance are being sent!");
process.on('unhandledRejection', error =>{ console.warn('An Error Occurred!\n' + error);
 });
/*
setTimeout(() => {
  try {
    foo();
  } catch (e) {
    Sentry.captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);*/
