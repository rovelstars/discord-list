let router = require("express").Router();
let path = require("path");
let auth = require("@utils/auth.js");
const marked = require("marked");
var proxy = require("proxy-list-random");

let sitemap;

async function gensitemap() {
  const botsmap = Cache.AllBots.map((bot) => {
    return `<url>\n<loc>${process.env.DOMAIN}/bots/${bot.id}</loc>\n<priority>0.9</priority>\n<changefreq>weekly</changefreq></url>`;
  }).join("\n");
  const serversmap = Cache.AllServers.map((server) => {
    return `<url>\n<loc>${process.env.DOMAIN}/servers/${server.id}</loc>\n<priority>0.9</priority>\n<changefreq>weekly</changefreq></url>`;
  }).join("\n");
  const Sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' +
    `\n<url>\n<loc>${process.env.DOMAIN}/</loc>\n<priority>1.00</priority><changefreq>weekly</changefreq>\n</url>\n` +
    botsmap +
    serversmap +
    "</urlset>";
  return Sitemap;
}
if (
  process.env.DOMAIN == "https://discord.rovelstars.com" &&
  !process.env.DOMAIN.includes("localhost")
) {
  async () => {
    sitemap = await gensitemap();
    fetch(`https://google.com/ping?sitemap=${process.env.DOMAIN}/sitemap.xml`);
  };
  setInterval(async function () {
    sitemap = await gensitemap();
    fetch(`https://google.com/ping?sitemap=${process.env.DOMAIN}/sitemap.xml`);
  }, 3600000);
}

router.get("/", async (req, res) => {
  var alerts;
  if (req.query.alert) {
    alerts = req.query.alert;
  }
  res.render("index.ejs", {
    bots: Cache.Bots.sortTopVoted(),
    servers: shuffle(Cache.AllServers).slice(0, 10),
    alerts,
  });
});

router.get("/bots", async (req, res) => {
  res.render("bots.ejs", { bots: Cache.Bots.sortNewAdded() });
});

router.get("/analytics", async (req, res) => {
  res.render("analytics.ejs");
});

router.get("/servers/:id", async (req, res) => {
  var server = await Servers.findOne({ id: req.params.id });
  var r;
  if (!server) return res.render("404.ejs", { path: req.originalUrl });
  else {
    r = await fetch(`${process.env.DOMAIN}/api/client/users/${server.owner}`);
    r = await r.json();
    server.owner = r.tag;
    r = await fetch(
      `${process.env.DOMAIN}/api/servers/${req.params.id}/invite`
    );
    r = await r.json();
    if (!r.err) {
      r = await fetch(
        `https://discord.com/api/v9/invites/${r.code}?with_counts=true`
      );
      r = await r.json();
      console.log(r);
      if (!r.message) {
        server.online = rovel.approx(r.approximate_presence_count);
        server.all = rovel.approx(r.approximate_member_count);
        server.desc = marked(server.desc.replace(/&gt;+/g, ">"));
        res.render("serverpage.ejs", { server });
      } else {
        server.desc = marked(server.desc.replace(/&gt;+/g, ">"));
        res.render("serverpage.ejs", { server });
      }
    } else {
      server.desc = marked(server.desc.replace(/&gt;+/g, ">"));
      res.render("serverpage.ejs", { server });
    }
  }
});

router.get("/servers/:id/join", (req, res) => {
  fetch(`${process.env.DOMAIN}/api/servers/${req.params.id}/invite`)
    .then((r) => r.json())
    .then((d) => {
      if (d.err) res.json({ err: d.err });
      else {
        res.redirect(`https://discord.gg/${d.code}`);
      }
    });
});

router.get("/manifest.json", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/manifest.json"));
});

router.get("/sitemap.xml", async (req, res) => {
  if (
    process.env.DOMAIN == "https://discord.rovelstars.com" &&
    !process.env.DOMAIN.includes("localhost")
  ) {
    res.header("Content-Type", "application/xml");
    if (!sitemap) {
      sitemap = await gensitemap();
      res.send(sitemap);
    } else {
      res.send(sitemap);
    }
  } else res.redirect("https://discord.rovelstars.com/sitemap.xml");
});

router.get("/bots/:id/vote", async (req, res) => {
  if (!res.locals.user) {
    var bot = Cache.Bots.findOneById(req.params.id);
    if (!bot) {
      res.render("404.ejs", { path: req.originalUrl });
    } else {
      res.render("botvote.ejs", { bot });
    }
  } else {
    var bot = Cache.Bots.findOneById(req.params.id);
    if (!bot) {
      res.render("404.ejs", { path: req.originalUrl });
    } else {
      var u = await Users.findOne({ id: res.locals.user.id });
      if (!u) {
        res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
        res.redirect("/login");
      } else {
        res.locals.user.bal = u.bal;
        res.render("botvote.ejs", { bot });
      }
    }
  }
});

router.get("/bots/:slug/invite", (req, res, next) => {
  Cache.Bots.findOne({ slug: req.params.slug }).then((bot) => {
    if (!bot) {
      res.render("404.ejs", { path: req.originalUrl });
    } else {
      res.redirect(bot.invite);
    }
  });
});

router.get("/bots/:id", async (req, res) => {
  fetch(`${process.env.DOMAIN}/api/bots/${req.params.id}/sync`).then(
    async () => {
      var bot = Cache.Bots.findOneById(req.params.id);
      if (!bot) {
        res.render("404.ejs", { path: req.originalUrl });
      } else {
        bot.desc = marked(bot.desc.replace(/&gt;+/g, ">"));
        bot.owner = [];
        for (const id of bot.owners) {
          await fetch(`${process.env.DOMAIN}/api/client/users/${id}`)
            .then((r) => r.json())
            .then(async (d) => {
              await bot.owner.push(d.tag);
            });
        }
        res.render("botpage.ejs", { bot });
        await Cache.Bots.refreshOne(bot.id);
      }
    }
  );
});

router.get("/dashboard", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    let botus = [];
    Users.findOne({ id: res.locals.user.id }).then(async (u) => {
      res.locals.user.bal = u.bal;
      res.locals.user.status = privatebot.guilds.cache
        .get("602906543356379156")
        .members.cache.get(u.id)?.presence?.status;
      var notjoined = false;
      if (!res.locals.user.status) notjoined = true;
      const bots = Cache.Bots.findByOwner(u.id);
      res.render("dashboard.ejs", { bots, notjoined });
    });
  }
});

router.get("/beta/dashboard", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    let botus = [];
    Users.findOne({ id: res.locals.user.id }).then(async (u) => {
      res.locals.user.bal = rovel.approx(u.bal);
      Cache.models.bots
        .findOne({ $text: { $search: res.locals.user.id } })
        .then(async (bots) => {
          for (const bot of bots) {
            if (bot.owners.includes(res.locals.user.id)) {
              botus.push(bot);
            }
          }
          res.render("newdashboard.ejs", { bots: botus });
        });
    });
  }
});

router.get("/dashboard/bots/new", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    res.render("dashboard-newbot.ejs");
  }
});

router.get("/dashboard/bots/edit/:id", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    var bot = Cache.Bots.findOneById(req.params.id);
    if (
      bot.owners.includes(res.locals.user.id) ||
      privatebot.owners.includes(res.locals.user.id)
    ) {
      bot = bot.toObject(); //get virtuals then
      res.render("editbot.ejs", { bot });
      await Cache.Bots.refreshOne(req.params.id);
    } else {
      res.json({ err: "unauth" });
    }
  }
});

router.get("/dashboard/bots/import", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    res.render("dashboard-importbot.ejs");
  }
});

router.get("/dashboard/servers/edit/:id", async (req, res) => {
  if (!res.locals.user) {
    res.cookie("return", req.originalUrl, { maxAge: 1000 * 3600 });
    res.redirect("/login");
  } else {
    var server = Cache.Servers.findOneById(req.params.id);
    if (
      server.owner == res.locals.user.id ||
      privatebot.owners.includes(res.locals.user.id)
    ) {
      server = server.toObject(); //get virtuals then
      res.render("editserver.ejs", { server });
      await Cache.Servers.refreshOne(req.params.id);
    } else {
      res.json({ err: "unauth" });
    }
  }
});

router.get("/status", (req, res) => {
  res.render("status.ejs");
});

router.get("/loaderio-39a018887f7a2f8e525d19a772e9defe", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/verify.txt"));
});

router.get("/favicon.ico", (req, res) => {
  res.redirect("/assets/img/bot/logo-36.png");
});
router.get("/robots.txt", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/robots.txt"));
});

router.get("/server", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/invite.html"));
});

router.get("/email", (req, res) => {
  res.redirect("mailto: support@rovelstars.com");
});

router.get("/arc-sw.js", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/arc-sw.js"));
});

router.get("/beta", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/join.html"));
});

router.get("/login", (req, res) => {
  if (req.cookies["key"]) {
    res.cookie("key", req.cookies["key"], { maxAge: 0 });
  }
  res.set("X-Robots-Tag", "noindex");
  res.cookie("newuser", "true", { maxAge: 1000 * 60 * 60 });
  let loginlink = auth.auth.link;
  if (req.query.servers=="false"){
    loginlink=loginlink.replace("%20guilds.join","");
  }
  if(req.query.email=="false"){
    loginlink=loginlink.replace("%20email","");
  }
  res.redirect(loginlink);
});

router.get("/logout", async (req, res) => {
  if (req.cookies["key"]) {
    const user = await auth.getUser(req.cookies["key"]).catch(() => {});
    fetch(`${process.env.DOMAIN}/api/client/log`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.SECRET,
        title: `${user ? user.tag : "IDK who"} Logouted!`,
        desc: `Bye bye ${
          user ? user.tag : "Unknown Guy"
        }\nSee you soon back on RDL!`,
        color: "#ff0000",
        img: user ? user.avatarUrl(128) : `${process.env.DOMAIN}/favicon.ico`,
        owners: user ? user.id : null,
      }),
    });
    res.cookie("key", req.cookies["key"], { maxAge: 0 });
  }
  if (req.query.return) {
    res.redirect(
      decodeURI(req.query.return).replace("https://discord.rovelstars.com", "")
    );
  } else if (req.cookies["return"]) {
    res.redirect(
      decodeURI(req.cookies["return"]).replace(
        "https://discord.rovelstars.com",
        ""
      )
    );
  } else {
    res.redirect("/");
  }
});

router.get("/ads.txt", (req, res) => {
  res.sendFile(path.resolve("src/public/assets/ads.txt"));
});

module.exports = router;
