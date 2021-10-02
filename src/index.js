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
rovel.fetch = function (url, opts) {
  return require("node-fetch")(encodeURI(url), opts);
};
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
if (process.env.WEBLOG == "true") {
  globalThis.logg = console.log;
  globalThis.console.log = loggy.log;
  globalThis.logerr = console.error;
  globalThis.console.error = loggy.error;
  globalThis.warnn = console.warn;
  globalThis.console.warn = loggy.warn;
}
console.log("[STARTING]");
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
  console.log("Closing off bots");
  privatebot.destroy();
  publicbot.destroy();
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
process.on("SIGINT", () => {
  console.log("SIGINT Recieved!");
  console.log("Closing off bots");
  privatebot.destroy();
  publicbot.destroy();
  console.log("Closing http server.");
  server.close(() => {
    console.log("Http server closed.");
    db.close(false, () => {
      console.log("MongoDb connection closed.");
      process.exit(0);
    });
  }, 3000);
});

globalThis.isCopy = function () {
  if (
    process.env.DOMAIN != "https://discord.rovelstars.com" &&
    !process.env.DOMAIN.includes("localhost:")
  ) {
    return false;
  } else return true;
};

if (!isCopy()) {
  globalThis.server = app.listen(port, () => {
    console.log(`[SERVER] Started on port: ${port}`);
  });
  console.warn(
    rovel.text.red(
      "[NOTIFICATION] I noticed that you're running your own deployment of RDL. We don't support it, and also, we won't help you setup your own deployment. Please run this only for testing and fixing."
    )
  );
  rovel.fetch(
    `https://discord.rovelstars.com/api/report?link=${process.env.DOMAIN}`
  );
} else {
  globalThis.server = app.listen(port, () => {
    console.log(`[SERVER] Started on port: ${port}`);
  });
}


var cloudcmd = require("cloudcmd");
var { Server } = require("socket.io");
var criton = require("criton");

const socket = new Server(server, {
  path: `/panel/socket.io`,
});
var username = process.env.CLOUDCMD_USERNAME;
var password = criton(process.env.CLOUDCMD_PASSWORD, "sha512WithRSAEncryption");
const config = {
  name: "Hackboard",
  auth: true,
  username,
  password,
  terminal: true,
  terminalPath: '/usr/local/lib/node_modules/gritty',
  vim: true
};

const filePicker = {
  data: {
    FilePicker: {
      key: "key",
    },
  },
};

const modules = {
  filePicker,
};

const { createConfigManager, configPath } = cloudcmd;

const configManager = createConfigManager({
  configPath,
});

app.use(
  "/panel",
  cloudcmd({
    socket, // used by Config, Edit (optional) and Console (required)
    config, // config data (optional)
    modules, // optional
    configManager, // optional
  })
);

app.get("*", (req, res) => {
  res.status(404).render("404.ejs", { path: req.originalUrl });
});

function addCommas(num, opts) {
  if (opts.separator === false) {
    return num.toString();
  }
  if (num < 1000) {
    return num.toString();
  }
  var separator = typeof opts.separator === "string" ? opts.separator : ",";

  var out = [],
    digits = Math.round(num).toString().split("");

  digits.reverse().forEach(function (digit, i) {
    if (i && i % 3 === 0) {
      out.push(separator);
    }
    out.push(digit);
  });
  return out.reverse().join("");
}
function formatDec(num, base, opts) {
  var workingNum = num / base;
  var ROUND = opts.round ? "round" : "floor";
  if (opts.decimal === false) {
    num = Math[ROUND](workingNum);
    return num.toString();
  }
  if (opts.precision) {
    num = workingNum;
  } else {
    num =
      workingNum < 10
        ? Math[ROUND](workingNum * 10) / 10
        : Math[ROUND](workingNum);
  }
  num = num.toString();
  if (typeof opts.decimal === "string") {
    num = num.replace(".", opts.decimal);
  }
  return num;
}
var THOUSAND = 1000;
var TEN_THOUSAND = 10000;
var MILLION = 1000000;
var BILLION = 1000000000;
var TRILLION = 1000000000000;
rovel.approx = function (num, opts) {
  if (isNaN(num)) return num;
  else if (num == Infinity || num == "Infinity") return "∞";
  else {
    var numString;
    opts = opts || {};
    var negative = num < 0;
    num = Math.abs(num);
    var thousandsBreak = opts.min10k ? TEN_THOUSAND : THOUSAND;
    if (num < thousandsBreak) {
      numString = addCommas(formatDec(num, 1, opts), opts);
    } else if (num < MILLION) {
      numString = formatDec(num, THOUSAND, opts) + "k";
    } else if (num < BILLION) {
      numString = formatDec(num, MILLION, opts) + "m";
    } else if (num < TRILLION) {
      numString = addCommas(formatDec(num, BILLION, opts), opts) + "b";
    } else {
      numString = addCommas(formatDec(num, TRILLION, opts), opts) + "t";
    }
    if (negative) {
      numString = "-" + numString;
    }
    if (opts.capital) {
      numString = numString.toUpperCase();
    }
    if (opts.prefix) {
      numString = opts.prefix + numString;
    }
    if (opts.suffix) {
      numString = numString + opts.suffix;
    }
    return numString;
  }
};

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

globalThis.TOPTOKENS = process.env.TOPTOKEN.split("|");
globalThis.TOPGGTOKEN = function () {
  const index = Math.floor(Math.random() * (TOPTOKENS.length - 1) + 1);
  return TOPTOKENS[index];
};
