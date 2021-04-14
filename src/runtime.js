const spawn = require('child_process').spawn;
const {fetch} = require("rovel.js");
var pm2 = false;
let queue = [];
function createChunks(str) {
    return str.match(new RegExp('.{1,' + 2000 + '}', 'g'));
}
function send(data) {
    if(!data) return;
    fetch(process.env.WEBHOOK, {
      method: "POST",
      headers:{
        "content-type": "application/json"
      },
      body: "```xl\n"+data+"\n```"
    })
}
function sendData(data) {
    data = escapeMarkdown(data.toString());
    createChunks(data).filter(a => !!a && a != null).map(a => queue.push);
}

function startlog() {

    if (pm2 !== false) {
        console.log('pm2 logs process already started...');
        return;
    }
    start = false;

    pm2 = spawn('pm2', ['logs']);
    pm2.on('exit', (code, signal) => {
        console.log('PM2 EXIT');
    })

    pm2.stderr.on('data', (data) => sendData(data));
    pm2.stdout.on('data', (data) => sendData(data));
    return pm2;
};
function escapeMarkdown(text) {
    return text.replace(/```/g, '`\u200b``');
}
startlog();
setInterval(()=>send(queue.shift()),500);