Error.stackTraceLimit = Infinity;
import WebSocket from "isomorphic-ws";
globalThis.WebSocket = WebSocket;
const v = process.version.slice(1, 3);
if (v < 20 && process.platform != "android") {
  console.error("[ERROR] Node.js v20 or above is required.");
  process.exit(1);
}
import rovel from "rovel.js";
rovel.env.config();
import fetch from "node-fetch";
rovel.fetch = function (url, opts) {
  return fetch(encodeURI(url), opts);
};
import mongoose from "mongoose";
mongoose.connect(process.env.DB || "mongodb://127.0.0.1:27017/test", {
  useNewUrlParser: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
import shell from "shelljs";
globalThis.shell = shell;
import * as loggy from "./utils/loggy.js";
if (process.env.WEBLOG_CONSOLE == "true") {
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
db.once("open", async function () {
  console.log("[DB] We're connected to database!");
  await import("./cache.js");
});

import "./bot/index.js"

import Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
if (process.env.SENTRY) {
  Sentry.init({
    dsn: process.env.SENTRY,
    tracesSampleRate: 1.0,
  });
  console.log(
    "[SENTRY] Initialized!\nAll issues and performance are being sent!"
  );
}
process.on("unhandledRejection", (error) => {
  console.warn("An Error Occurred!\n" + error.stack);
});

import {app, port} from "./server/app.js";

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
  console.log("\nSIGINT Recieved!");
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
    (!process.env.DOMAIN.includes("localhost:") || !process.env.DOMAIN.includes("127.0.0.1:"))
  ) {
    return false;
  } else return true;
};

app.get("*", (req, res) => {
  res.status(404).render("404.ejs", { path: req.originalUrl });
});

globalThis.server = app.listen(port, () => {
  console.log(`[SERVER] Started on port: ${port}`);
});

globalThis.selfbot = async function (path) {
  return await fetch(`https://discord.com/api/v9${path}`, {
    headers: {
      Authorization: process.env.SELFBOT_TOKEN || "failure management",
    },
  }).then((r) => r.json());
};
if (process.env.SELFBOT_TOKEN) {
  selfbot("/users/@me").then((user) => {
    if (user.message == "401: Unauthorized") {
      console.log("[SELFBOT] Failed to login:");
      console.log(user.message);
      process.exit(0);
    } else {
      console.log(
        `[SELFBOT] Logged in as ${user.username + "#" + user.discriminator + " [" + user.id + "]"
        }`
      );
    }
  });
}

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

globalThis.TOPTOKENS = process.env.TOPTOKEN?.split?.("|") || [];
globalThis.TOPGGTOKEN = function () {
  const index = Math.floor(Math.random() * (TOPTOKENS.length - 1) + 1);
  return TOPTOKENS[index];
};
