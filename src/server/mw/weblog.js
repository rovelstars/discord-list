const geoip = require("geoip-lite");
const dayjs = rovel.time;

module.exports = async function(req, res, next) {
 const weburl = process.env.WEBHOOK;
 if (req.query.code) {
  var botu = await Bots.findOne({ code: req.query.code });
  if (botu) {
   res.locals.botid=botu.id;
   botu = `${botu.id} (${botu.tag})`;
  }
 }
 const user = (res.locals.user) ? res.locals.user.tag : "Not logined";
 const geo = await geoip.lookup(req.cf_ip);
 const logweb = `**New Log!**\n**Time:** \`${dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")}\`\n**IP:** ||${req.cf_ip}||\n**Path requested:** \`${req.originalUrl}\`\n**Request type:** \`${req.method}\`\n**Location:** ${(geo)?geo.timezone:"idk"}\n**User:** ${user}\n**Bot:** \`${botu || "nope"}\`\n**Browser:** \`${(req.headers['user-agent'])?req.headers['user-agent']:"api request"}\``;
 await fetch(weburl, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL logging",
   "content": logweb
  })
 });
 next();
}