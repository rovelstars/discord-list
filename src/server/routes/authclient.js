const router = require("express").Router();
const { fetch } = require("rovel.js");
const auth = require("@utils/auth.js");
const validate = require("validator");

router.use(require("express").json());

router.get("/", async (req, res) => {
  try {
    const key = await auth.getAccess(req.query.code);
    const raw = await auth.raw(key);
    const user = await auth.getUser(key);

    if (BannedList.includes(user.id)) {
      await Cache.Users.deleteOne({ id: user.id });
    }

    if (!BannedList.includes(user.id)) {
      const result = await Cache.Users.findOne({ id: user.id });

      if (!result) {
        if (raw.scope.includes("guilds.join")) {
          privatebot.guilds.cache
            .get("602906543356379156")
            .members.add(user.id, {
              accessToken: raw.access_token,
              roles: ["889746995034587146", "889756830333558814"],
            });
        }

        if (req.cookies["referral"]) {
          const referringUser = await Cache.Users.findOne({ id: req.cookies["referral"] });

          if (referringUser) {
            referringUser.bal += 100;
            await referringUser.save();

            fetch(`${process.env.DOMAIN}/api/client/log`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.SECRET,
                title: `Thanks for Referring to ${user.tag} !`,
                desc: "You received **R$100** for referring them. Thanks for bringing your friends to RDL! Have a nice day!",
                channel: "private",
                owners: [referringUser.id],
              }),
            });
          }

          res.cookie("referral", "", { maxAge: 0 });
        }

        const newUser = new Cache.models.users({
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          email: user.emailId || undefined,
          avatar: user.avatarHash ? user.avatarHash : user.discriminator % 5,
        });

        await newUser.save();

        Cache.Users.refresh();

        fetch(`${process.env.DOMAIN}/api/client/log`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            secret: process.env.SECRET,
            title: `New User: ${user.tag}`,
            desc: `**${user.tag}** joined the server. Welcome them to RDL!`,
            channel: "logs",
          }),
        });
      }

      res.cookie("key", key, { maxAge: 2592000000, httpOnly: true });
      res.redirect("/earn");
    } else {
      res.send("You are banned from using this service.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/key", (req, res) => {
  const key = req.cookies["key"];
  res.send(key || "No key found");
});

router.get("/email", async (req, res) => {
  try {
    const key = req.query.key || req.cookies["key"];
    const user = await Cache.Users.findOne({ id: key });

    if (!user) {
      res.send("User not found");
      return;
    }

    const email = req.query.email;

    if (email && validate.isEmail(email)) {
      user.email = email;
      await user.save();
      res.send("Email updated successfully");
    } else {
      res.send(user.email || "No email found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/user", async (req, res) => {
  try {
    const key = req.query.key || req.cookies["key"];
    const user = await Cache.Users.findOne({ id: key });

    if (user) {
      res.send(user);
    } else {
      res.send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/earn", async (req, res) => {
  try {
    const key = req.query.key || req.cookies["key"];
    const user = await Cache.Users.findOne({ id: key });

    if (!user) {
      res.send("User not found");
      return;
    }

    // Handle cooldown logic and increment balance
    // ...

    res.send(`Earned ${coins} coins. Balance: ${user.balance}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
