let {app} = require("./index.js");
let log = console.log;
const rovel = require("rovel.js")
const fetch = rovel.fetch;
const error = rovel.text.bold.red;
const warn= rovel.text.yellow;
const dayjs = rovel.time;
const logs = rovel.text.blue;
const ans = rovel.text.green;
const rateLimit = require("express-rate-limit");

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});

if(process.argv.includes("--hosting")){
//app.set('trust proxy', 1);
app.use(limiter);
}
if(process.argv.includes("--logs")){

 process.on('unhandledRejection', err =>{
        var unre = function (req, res, next) {
        log(error("**PROCESS** - Unhandled Rejection:\n")+warn(err));
        next(err);
        app.use(unre);
        }});

var logger = function (req, res, next) {
        log();
        log(logs("Time: ") + ans(dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")));
        const ip = req.ip || req.ips;
        log(logs('IP: ') + ans(ip));
        log(logs('Path requested: ') + ans(req.originalUrl));
        log(logs('Request.type: ') + ans(req.method));
        next();
}
app.use(logger);
log(logs("Using console logging"));
}
if(process.argv.includes("--webhook")){
        var weblog = function (req, res, next) {
        const weburl = process.env.WEBHOOK;
        const logweb = `              **New Log!**\n**Time:** \`${dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")}\`\n**IP:** ||${req.ip || req.ips}||\n**Path requested:** \`${req.originalUrl}\`\n**Request type:** \`${req.method}\``;
        fetch(weburl, {
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
app.use(weblog);
log(logs("Using webhooks"));
}
log(warn("[SERVER] ")+error("Started!\n")+ans("At Time: ")+logs(dayjs().format("ss | mm | hh A - DD/MM/YYYY Z")));

app.get("/", (req, res)=>{
 res.send("RDL under Development (⌐■-■) Please come back later. Until then, join our discord server https://discord.gg/953XCpHbKF");
});
