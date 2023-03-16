let router = require("express").Router();
var { fetch } = require("rovel.js");
let auth = require("@utils/auth.js");
router.use(require("express").json());

router.get("/", (req, res) => {
  if (req.query.q) {
    res.json(shuffle(Search(Cache.Users.clean(Cache.AllUsers), req.query.q)).slice(0, 10));
  } else {
    if(req.query.secret==process.env.SECRET) res.json(Cache.AllUsers);
    else res.json(Cache.Users.clean(Cache.AllUsers));
  }
});

router.get("/:id", (req, res) => {
  Cache.Users.findOne({ id: req.params.id }).then((user) => {
    res.json(Cache.Users.clean(user));
  });
});
router.get("/:id/delete", (req, res) => {
  if (!res.locals.user) return res.json({ err: "not_logged in" });
  else {
    Cache.Users.findOne({ id: res.locals.user.id }).then((user) => {
      if (!user) return;
      //logout
      if (req.cookies["key"]) {
        fetch(`${process.env.DOMAIN}/api/client/log`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            secret: process.env.SECRET,
            title: `${user ? user.tag : "IDK who"} Logged out!`,
            desc: `Bye bye ${
              user ? user.tag : "Unknown Guy"
            }\nSee you soon back on RDL!`,
            color: "#ff0000",
            img: user ? user.avatarURL : `${process.env.DOMAIN}/favicon.ico`,
            owners: user ? user.id : null,
          }),
        });
        res.cookie("key", req.cookies["key"], { maxAge: 0 });
      }

      res.json({ deleted: true });
      fetch(`${process.env.DOMAIN}/api/client/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.SECRET,
          desc: `${user.tag} deleted their account!\n**R$ wasted**: ${user.bal}\nIncase it was deleted accidentally, the above data may be added back again manually if the user is added back to RDL`,
          title: "User Deleted!",
          color: "#ff0000",
          owners: [user.id],
          img: user.avatarURL,
          url: process.env.DOMAIN,
        }),
      });
      Cache.Users.deleteOne({ id: user.id }, () => {});
    });
  }
});
router.get("/:id/sync", (req, res) => {
  Users.findOne({ id: req.params.id }).then((user) => {
    if (!user) return res.json({ err: "not_found" });
    else {
      fetch(`${process.env.DOMAIN}/api/client/users/` + user.id)
        .then((r) => r.json())
        .then((u) => {
          if (
            u.avatar === user.avatar &&
            u.username === user.username &&
            u.discriminator === user.discriminator
          )
            return res.json({ err: "same_data" });
          else {
            if (u.avatar !== user.avatar) {
              user.avatar = u.avatar;
            }
            if (u.username !== user.username) {
              user.username = u.username;
            }
            if (u.discriminator !== user.discriminator) {
              user.discriminator = u.discriminator;
            }
            user.save();
            fetch(`${process.env.DOMAIN}/api/client/log`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.SECRET,
                img: u.avatarURL,
                desc: `New Data Saved:\n\`\`\`json\n${JSON.stringify(
                  user
                )}\n\`\`\``,
                title: ` User ${u.tag} Data Updated!`,
                color: "#FEE75C",
                url: `${process.env.DOMAIN}/users/${u.id}`,
              }),
            });
            res.json({ success: true });
          }
        });
    }
  });
});
module.exports = router;
