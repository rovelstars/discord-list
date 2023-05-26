require("module-alias/register"); // Enable module aliases
Error.stackTraceLimit = Infinity; // Set the maximum stack trace limit
globalThis.WebSocket = require("isomorphic-ws"); // Assign WebSocket to globalThis
const v = process.version.slice(1, 3); // Get the Node.js version (e.g., "16")
if (v < 16 && process.platform != "android") {
  console.error("[ERROR] Node.js v16 or above is required.");
  process.exit(1);
}
var rovel = require("rovel.js"); // Import the rovel.js module
rovel.env.config(); // Configure environment variables using rovel.js
rovel.fetch = function (url, opts) {
  return require("node-fetch")(encodeURI(url), opts);
}; // Override the fetch function in rovel.js with node-fetch
const mongoose = require("mongoose"); // Import the mongoose module
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
}); // Connect to the MongoDB database
globalThis.shell = require("shelljs"); // Assign shelljs to globalThis
const loggy = require("@utils/loggy.js"); // Import the loggy.js module
if (process.env.WEBLOG_CONSOLE == "true") {
  // Check if WEBLOG_CONSOLE environment variable is set to true
  globalThis.logg = console.log;
  globalThis.console.log = loggy.log;
  globalThis.logerr = console.error;
  globalThis.console.error = loggy.error;
  globalThis.warnn = console.warn;
  globalThis.console.warn = loggy.warn;
}
console.log("[STARTING]");
globalThis.fetch = rovel.fetch; // Assign the overridden fetch function to globalThis
globalThis.console.debug = function (obj) {
  // Assign a custom console.debug function to globalThis
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
  console.log("[DB] We're connected to the database!");
  require("./cache.js"); // Require the cache.js file
});
require("@bot/index.js"); // Require the index.js file in the @bot directory

const Sentry = require("@sentry/node"); // Import the Sentry module
const Tracing = require("@sentry/tracing"); // Import the Sentry Tracing module
if (process.env.SENTRY) {
  // Check if SENTRY environment variable is set
  Sentry.init({
    dsn: process.env.SENTRY,
    tracesSampleRate: 1.0,
  }); // Initialize Sentry with the provided DSN
  console.log("[SENTRY] Initialized!\nAll issues and performance are being sent!");
}
process.on("unhandledRejection", (error) => {
  console.warn("An Error Occurred!\n" + error.stack);
});

const { app, port } = require("@server/app.js"); // Import the app and port variables from @server/app.js
globalThis.app = app; // Assign app to globalThis
globalThis.port = port; // Assign port to globalThis

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
  console.log("SIGTERM Received!");
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
  console.log("\nSIGINT Received!");
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
        `[SELFBOT] Logged in as ${
          user.username + "#" + user.discriminator + " [" + user.id + "]"
        }`
      );
    }
  });
}

function addCommas(num, opts) {
  // Function to add commas to numbers
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
  // Function to format numbers with decimal points
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
  // Function to approximate large numbers
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

globalThis.TOPTOKENS = process.env.TOPTOKEN.split("|");

globalThis.TOPGGTOKEN = function () {
  // Function to get a random TOP.GG token
  const index = Math.floor(Math.random() * (TOPTOKENS.length - 1) + 1);
  return TOPTOKENS[index];
};
