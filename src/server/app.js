const port = process.env.PORT || 3000;
process.env.ANNOUNCE = "No Announcements to show!";
import fs from "node:fs";
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

globalThis.shuffle = shuffle;
import { langs } from "../data.js";
let ping;
import actuator from "express-actuator";
import * as marked from "marked";
import cloudflare from "cloudflare-express";

import Bots from "../models/bots.js";
import Users from "../models/users.js";
import Servers from "../models/servers.js";

globalThis.Bots = Bots;
globalThis.Users = Users;
globalThis.Servers = Servers;
async function Update() {
  publicbot.guilds.cache.get("602906543356379156")?.bans?.fetch()?.then((list) => {
    globalThis.BannedList = list.map((b) => b.user.id);
  });
}
globalThis.updateCache = Update;
setInterval(Update, 300000);

import servers from "./routes/servers.js";
import embeds from "./routes/embeds.js";
import prefers from "./routes/prefers.js";
import users from "./routes/users.js";
import comments from "./routes/comments.js";
import Search from "../utils/search.js";
import translate from "translatte";
import info from "../utils/info.js";
import express from "express";
import Indent from "min-indent";

globalThis.Search = Search;
globalThis.translate = translate;
globalThis.indent = function (str) {
  if (!str.includes("\n")) {
    const length = Indent(str);
    const regexinside = new RegExp(`^[ \\t]{${length}}`, "gm");
    return str.replace(regexinside, "");
  } else {
    str = str.split("\n")
      .map((t) => {
        const length = Indent(t);
        const regexinside = new RegExp(`^[ \\t]{${length}}`, "gm");
        return t.replace(regexinside, "");
      })
      .join("\n");
    return str;
  }
};

const app = express();
import compression from "compression";
import agents from "../utils/agents.json" with { type: "json" };
import client from "../bot/index.js";
import auth from "../utils/auth.js";
import authRoute from "./routes/authclient.js";
globalThis.auth = auth;
export {
  app,
  port
};
import cookieParser from "cookie-parser";
app.use(cloudflare.restore({ update_on_start: true }));
app.disable("x-powered-by");
app.use(cookieParser({ filter: true }));
app.use(compression());
let log = console.log;
globalThis.rovel = rovel;
const fetch = rovel.fetch;
const dayjs = rovel.time;
import rateLimit from "express-rate-limit";
import path from "node:path";
globalThis.path = path;
import bots from "./routes/bots.js";
import non_api from "./routes/non-api.js";
globalThis.started = false;
process.on("STARTED", () => {
  console.log(rovel.text.green(`Everything Started! RDL is ready to go!`));
  globalThis.started = true;
});
// ejs setting
app.set("view engine", "ejs");
app.set("views", path.resolve("src/views"));
app.use(express.json());
const limiter = rateLimit({
  windowMs: 60 * 1000, // 60 secs
  max: 60,             // limit each IP to 60 requests per windowMs
  message: { err: "ratelimited" },
  keyGenerator: function (
    req,
    res) { return res?.locals?.user?.id || res?.locals?.botid || req.ip; },
});
app.set("trust proxy", 1);
app.all("/", (req, res, next) => {
  if (req.originalUrl.startsWith("/assets")) {
    res.writeHead(202).catch((e) => console.log(e.stack));
    res.write(" ");
  }
  // make the server giving respond fast
  next();
});
process.on("unhandledRejection", (err) => {
  var unre = function (req, res, next) {
    log(error("**PROCESS** - Unhandled Rejection:\n") + warn(err));
    next(err);
    app.use(unre);
  };
});
app.use(actuator({ basePath: "/api" }));
import booting from "./mw/booting.js";
app.use(booting);

import querybugfix from "./mw/querybugfix.js";
import checkBanned from "./mw/checkBanned.js";
import userSetup from "./mw/userSetup.js";
import alerts from "./mw/alerts.js";
import keepAlive from "./mw/keepAlive.js";
import ls from "./mw/linkService.js";
import dnd from "./mw/doOrDoNot.js";
import ree from "./mw/error.js";
import weblog from "./mw/weblog.js";
import rovel from "rovel.js";
app.use(querybugfix);
app.use(keepAlive);
app.use(ls);
app.use(userSetup);
app.use(alerts);
app.use(weblog);
app.use(checkBanned);
app.use(dnd);
app.use(ree);
app.use("/", limiter);


log("[SERVER] Started!\n[SERVER] Webhooks started!");

app.use("/assets", express.static(path.resolve("src/public/assets")));
app.use("/api/bots", bots);
app.use("/api/users", users);
app.use("/api/auth", authRoute);
app.use("/api/client", client);
app.use("/api/servers", servers);
app.use("/api/comments", comments);
app.use("/api/embeds", embeds);
app.use("/api/preferences", prefers);
app.get("/api/download", (req, res) => {
  if (req.query.pass != process.env.DOWNLOAD_PASS)
    return res.status(401).json({ err: "Unauthorized" });
  if (!req.query.pass)
    return res.status(400).json({ err: "Bad Request" });
  // send all the info from db. useful for moving db to another db.
  let data = {
    bots: Cache.AllBots,
    users: Cache.AllUsers,
    servers: Cache.AllServers
  };
  return res.json(data);
});
app.get("/api", (req, res) => { res.json({ hello: "coder!" }); });

app.post("/api/translate", async (req, res) => {
  if (!req.body.text) {
    res.json({ err: "no_text" });
  } else {
    if (!req.body.to) {
      req.body.to = "en";
    }
    if (!req.body.from) {
      req.body.from = "auto";
    }
    if (typeof req.body.text == "object") {
      var arr = req.body.text;
      const a = arr;
      arr = arr.map((t) => { return t.split("+").join("/+/"); });
      arr = arr.join("++");
      translate(arr, { to: req.body.to, from: req.body.from }).then((r) => {
        r.text = r.text.split("++").map((t, i) => {
          t = t.split("/ + /").join("+").trim();
          if (t.includes(" +") && !a[i].includes(" +")) {
            t = t.split(" +").join("+");
          }
          return t;
        });
        res.json({ text: r.text });
      });
    }
    if (typeof req.body.text == "string") {
      translate(req.body.text, { to: req.body.to, from: req.body.from })
        .then((r) => { res.json({ text: r.text }); });
    }
  }
});

app.get("/api/*", (req, res) => { res.status(404).json({ err: 404 }); });

app.get("/comments", (req, res) => { res.render("comments.ejs"); });
app.use("/comments", express.static(path.resolve("src/comments")));
app.get + ("/hi", (req, res) => {
  fetch(`${process.env.DOMAIN}`).then((r) => r.text()).then((d) => {
    translate(d, { to: "hi" }).then((re) => { res.send(re.text); });
  });
});
app.use("/", non_api);
