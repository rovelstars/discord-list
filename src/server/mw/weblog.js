import rovel from "rovel.js";
const dayjs = rovel.time;
const { green, yellow, red, bold } = rovel.text;
export default async function (req, res, next) {
  const weburl = process.env.WEBHOOK;
  if (req.query.code) {
    var botu = await Bots.findOne({ code: req.query.code });
    if (botu) {
      res.locals.botid = botu.id;
      botu = `${botu.id} (${botu.tag})`;
    }
  }
  const user = res.locals.user ? res.locals.user.tag : "Not logged in";

  console.log(
    `${green("New Log!")}\n${yellow("Time:")} ${dayjs().format(
      "ss | mm | hh A - DD/M | M/YYYY Z"
    )}\n${yellow("IP:")} ${req.cf_ip}\n${
      yellow("Path requested:") + " " + req.originalUrl
    }\nRequest type: ${req.method}\nUser: ${user}\nBot: ${
      botu || "nope"
    }\nBrowser: ${
      req.headers["user-agent"] ? req.headers["user-agent"] : "api request"
    }`
  );
  next();
};
