var rovel = require("rovel.js");
var eventEmitter = require("events");
var event = new eventEmitter();
var RDLclient;
var code;
var logined = false;
async function getBotInfo(id){
if(logined) return await rovel.fetch(`https://discord.rovelstars.com/api/bots/${id}?code=${code}`).then(r=>r.json());
};

async function test(){
  if(logined) return await rovel.fetch(`https://discord.rovelstars.com/api?code=${code}`).then(r=>r.json());
};

async function login(key){
  if(!key) throw "no_key";
  await rovel.fetch(`https://discord.rovelstars.com/api/bots/info?code=${key}`).then(r=>r.json()).then(res=>{
    if(res.err){
      throw res.err;
    }
    else {
      res = RDLclient;
      logined = true;
      event.emit('login', RDLclient);
    }
  });
};

async function server(app, basePath){
  if(basePath==undefined) basePath = "/";
  if(!basePath.startsWith("/")) basePath="/"+basePath;
  if(app==undefined) throw "no_express_server";
  app.get("/", (req, res)=>{
    res.json({status: "UP"});
  });
  event.emit('serverStarted', true);
}

async function hmm(hmm){ //dont scream if you read this
  event.emit('hmm', 'hmm');
}

async function updateCard(img, title, msg){
  if(logined){
  if(!img) throw "no_img";
  if(!title) throw "no_title";
  if(!msg) throw "no_msg";
  rovel.fetch(`https://discord.rovelstars.com/api/bots/${RDLclient.id}/card?code=${code}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({img, title, msg})
  }).then(r=>r.json()).then(d=>{
    if(d.err) throw d.err;
    else return d;
  });
 }
}

module.exports = {event, test, getBotInfo, login, server, updateCard};