let router = require("express").Router();

router.all("*", (req, res, next) => {
  if (req.hostname == "rovelstars.com") {
    res.set("location", `https://discord.rovelstars.com${req.path}`);
    res.status(301).send();
  } else next();
});

router.get("/b/:slug", (req, res, next) => {
  if (req.hostname != "dscrdly.com") {
    next();
  } else {
    Cache.Bots.findOne({ slug: req.params.slug }).then((bot) => {
      if (!bot) {
        res.render("404.ejs", { path: req.originalUrl });
      } else {
        res.redirect(`${process.env.DOMAIN}/bots/${bot.id}`);
      }
    });
  }
});

router.get("/b/:slug/invite", (req, res, next) => {
  if (req.hostname != "dscrdly.com") {
    next();
  } else {
    Cache.Bots.findOne({ slug: req.params.slug }).then((bot) => {
      if (!bot) {
        res.render("404.ejs", { path: req.originalUrl });
      } else {
        res.redirect(bot.invite);
      }
    });
  }
});

router.get("/b/:slug/vote", (req, res, next) => {
  if (req.hostname != "dscrdly.com") {
    next();
  } else {
    Cache.Bots.findOne({ slug: req.params.slug }).then((bot) => {
      if (!bot) {
        res.render("404.ejs", { path: req.originalUrl });
      } else {
        res.redirect(`${process.env.DOMAIN}/bots/${bot.id}/vote`);
      }
    });
  }
});

router.get("/:slug", (req, res, next) => {
  if (req.hostname != "fateslist.xyz") {
    next();
  } else {
    Cache.Bots.findOne({ slug: req.params.slug }).then((bot) => {
      if (bot) {
        res.redirect(`https://fateslist.xyz/bots/${bot.id}`);
      } else{
         Cache.Servers.findOne({ slug: req.params.slug }).then((server) => {
          if (server) {
            res.redirect(`https://fateslist.xyz/servers/${server.id}`);
          } else {
            res.redirect(`https://discord.rovelstars.com${req.path}`);
          }
        });
      }
      });
  }
});


router.get("/s/:slug", (req, res, next) => {
  if (req.hostname != "dscrdly.com") {
    next();
  } else {
    Cache.Servers.findOne({ slug: req.params.slug }).then((server) => {
      if (!server) {
        res.render("404.ejs", { path: req.originalUrl });
      } else {
        res.redirect(`${process.env.DOMAIN}/servers/${server.id}`);
      }
    });
  }
});

router.get("*", (req, res, next) => {
  if (req.hostname == "dscrdly.com") {
    res.redirect(`${process.env.DOMAIN}${req.originalUrl}`);
  } else {
    next();
  }
});

module.exports = router;
