import { Router } from "express";
const router = Router();
import { fetch } from "rovel.js";

router.get("/bots/:id/status", (req, res) => {
  Bots.findOne({ id: req.params.id }).then((bot) => {
    if (!bot) return res.send("no_bot");
    if (!bot.status) bot.status = "ONLINE";
    let color;
    if (bot.status == "online") {
      color = "43b581";
    } else if (bot.status == "dnd") {
      color = "f04747";
    } else if (bot.status == "idle") {
      color = "faa61a";
    } else if (bot.status == "offline") {
      color = "2f3136";
    }
    const style = req.query.style ? req.query.style : "for-the-badge";
    color = req.query.color ? req.query.color : color;
    const label = req.query.label ? req.query.label : "Status";
    fetch(
      `https://img.shields.io/static/v1?label=${label}&message=${bot.status}&color=${color}&style=${style}`
    )
      .then((r) => r.text())
      .then((d) => {
        res.send(d);
      });
  });
});

router.get("/bots/:id/owners", (req, res) => {
  Bots.findOne({ id: req.params.id }).then(async (bot) => {
    if (!bot) return res.send("no_bot");
    const style = req.query.style ? req.query.style : "for-the-badge";
    const color = req.query.color ? req.query.color : "green";
    const label = req.query.label ? req.query.label : "Owners";
    bot.owner = [];
    for (const id of bot.owners) {
      await fetch(`${process.env.DOMAIN}/api/client/users/${id}`)
        .then((r) => r.json())
        .then(async (d) => {
          await bot.owner.push(d.username);
        });
    }
    await fetch(
      `https://img.shields.io/static/v1?label=${label}&message=${encodeURI(
        bot.owner.join(", ")
      )}&color=${color}&style=${style}`
    )
      .then((r) => r.text())
      .then((d) => {
        res.send(d);
      });
  });
});

export default router;
