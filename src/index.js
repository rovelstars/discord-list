require("module-alias/register");
Error.stackTraceLimit = Infinity;
globalThis.WebSocket = require("isomorphic-ws");
const v = process.version.slice(1, 3);
if (v < 16 && process.platform != "android") {
  console.error("[ERROR] Node.js v16 or above is required.");
  process.exit(1);
}
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str, newStr) {
    // If a regex pattern
    if (
      Object.prototype.toString.call(str).toLowerCase() === "[object regexp]"
    ) {
      return this.replace(str, newStr);
    }
    // If a string
    return this.replace(new RegExp(str, "g"), newStr);
  };
}
var rovel = require("rovel.js");
rovel.env.config();
const mongoose = require("mongoose");
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
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
globalThis.console.debug = function (obj) {
  if (typeof obj.stack == "string" && typeof obj == "object") {
    console.log(obj.stack);
  } else console.log(obj);
};

if (!process.env.DOMAIN) {
  console.error("[ERROR] No Domain Given!");
  process.exit(0);
}
if (process.env.DOMAIN.endsWith("/")) {
  process.env.DOMAIN = process.env.DOMAIN.slice(0, -1);
}
globalThis.db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("[DB] We're connected to database!");
  require("./cache.js");
});
require("@bot/index.js");

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
Sentry.init({
  dsn: process.env.SENTRY,
  tracesSampleRate: 1.0,
});
console.log(
  "[SENTRY] Initialized!\nAll issues and performance are being sent!"
);
process.on("unhandledRejection", (error) => {
  console.warn("An Error Occurred!\n" + error.stack);
});

const { app, port } = require("@server/app.js");
globalThis.app = app;
globalThis.port = port;

globalThis.analytics = {};
analytics.total = 1008;
analytics.bots = 153;
analytics.badded = 25;
analytics.joins = 2;
analytics.bvotes = 47;
globalThis.random = function random(n) {
  const random = Math.floor(Math.random() * 5);
  const ans = Math.floor(Math.random() * (n || 3));
  if (random == 0) analytics.total += ans;
  return random == 0 ? ans : 0;
};
process.on("SIGTERM", () => {
  console.log("SIGTERM Recieved!");
  console.log("Closing http server.");
  server.close(() => {
    console.log("Http server closed.");
    // boolean means [force], see in mongoose doc
    db.close(false, () => {
      console.log("MongoDb connection closed.");
      process.exit(0);
    });
  }, 3000);
});

require("./build/start.js");

require("./build/run.js");

const { Wallet } = require("simplebtc");
globalThis.wallet = new Wallet({
  address: process.env.WALLET_KEY,
  localCurrency: process.env.CURRENCY,
});

wallet.watchNewTransactions().subscribe((transaction) => {
  rovel.fetch(`${process.env.DOMAIN}/api/client/log`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.parse({
      secret: process.env.SECRET,
      title: "New Transaction!",
      url: `https://explorer.bitcoin.com/btc/tx/${transaction.id}`,
      desc: `**From:** ${transaction.senders.join(", ")}\n**Amount:** ${
        transaction.amount
      } **${wallet.localCurrency}**\n**At:** \`${rovel
        .time(transaction.timestamp)
        .format("ss | mm | hh A - DD/MM/YYYY Z")}\`\n**Confirmation:** ${
        transaction.isConfirmed ? "Yes" : "No"
      }`,
      attachment: "https://explorer.bitcoin.com/images/social.png",
    }),
  });
});

process.env.TOPTOKEN=process.env.TOPTOKEN.split("|");
globalThis.TOPGGTOKEN=function(){
 const index = Math.floor(Math.random() * (process.env.TOPTOKEN.length - 1) + 1);
 return process.env.TOPTOKEN[index];
}

const { Server: wsServer } = require("ws");

globalThis.wss = new wsServer({ server });

wss.on("connection", function connection(ws, req) {
  ws.on("message", function incoming(message) {
    var msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      ws.send(JSON.stringify({ err: "parse_failed" }));
    }
    if (typeof msg != undefined) {
      if (msg?.event == "ping") ws.send(JSON.stringify({ res: "pong" }));
    }
  });
});
