const dayjs = rovel.time;
const { green, yellow, red, bold } = rovel.text;
module.exports = async function (req, res, next) {
  const weburl = process.env.WEBHOOK;
  if (req.query.code) {
    var botu = await Bots.findOne({ code: req.query.code });
    if (botu) {
      res.locals.botid = botu.id;
      botu = `${botu.id} (${botu.tag})`;
    }
  }
  const user = res.locals.user ? res.locals.user.tag : "Not logged in";
  if (process.env.WEBLOG_API == "true") {
    const logweb = `**New Log!**\n**Time:** \`${dayjs().format(
      "ss | mm | hh A - DD/MM/YYYY Z"
    )}\`\n**IP:** ||${req.cf_ip}||\n**Path requested:** \`${
      req.originalUrl
    }\`\n**Request type:** \`${req.method}\`\n**User:** ${user}\n**Bot:** \`${botu || "nope"}\`\n**Browser:** \`${
      req.headers["user-agent"] ? req.headers["user-agent"] : "api request"
    }\``;
    await fetch(weburl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "RDL logging",
        content: logweb,
      }),
    });
  } else {
    if (process.env.WEBLOG_CONSOLE) {
      console.log(
        `${green("New Log!")}\n${yellow("Time:")} ${dayjs().format(
          "ss | mm | hh A - DD/M | M/YYYY Z"
        )}\n${yellow("IP:")} ${req.cf_ip}\n${
          yellow("Path requested:") + " " + req.originalUrl
        }\nRequest type: ${req.method}\nUser: ${user}\nBot: ${botu || "nope"}\nBrowser: ${
          req.headers["user-agent"] ? req.headers["user-agent"] : "api request"
        }`
      );
    } else {
      logg(
        `${green("New Log!")}\n${yellow("Time:")} ${dayjs().format(
          "ss | mm | hh A - DD/M | M/YYYY Z"
        )}\n${yellow("IP:")} ${req.cf_ip}\n${
          yellow("Path requested:") + " " + req.originalUrl
        }\nRequest type: ${req.method}\nUser: ${user}\nBot: ${botu || "nope"}\nBrowser: ${
          req.headers["user-agent"] ? req.headers["user-agent"] : "api request"
        }`
      );
    }
  }
  next();
};
