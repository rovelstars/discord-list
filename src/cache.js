(async function(){
bots = require("@models/bots.js");
users = require("@models/users.js");
servers = require("@models/servers.js");
globalThis.Cache = {};
console.log("[CACHE] Started!");

/*only Arrays, Objects, Functions are referenced.
Others are not*/

AllBots = await bots.find();
AllUsers = await users.find();
AllServers = await servers.find();

Bots = {};

Cache.AllBots = await AllBots;
Cache.AllUsers = await AllUsers;
Cache.AllServers = await AllServers;
Cache.models = {bots, users, servers};
Cache.Bots = Bots;

Bots.findOneById = function (q){
 return AllBots[AllBots.findIndex(b=>b.id==q)];
}

Bots.findOneByCode = function (q){
 return AllBots[AllBots.findIndex(b=>b.code==q)];
}

Bots.clean = function(arg){
  const {_id, code, ...bot} = arg;
  return bot;
}

Bots.findByOwners = function(id){
 return AllBots[AllBots.findIndex(b=>b.includes(id))];
}

})();