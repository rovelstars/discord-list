(async function() {
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
 Cache.models = { bots, users, servers };
 Cache.Bots = Bots;

 Bots.findOne = async function(q) {
  return AllBots[AllBots.findIndex(b => b.id == q.id)];
 }

 Bots.sortNewAdded = function() {
  return [...AllBots.reverse().slice(0, 9)];
 }

 function compare(a, b, on) {
  if (a[on] < b[on]) {
   return -1;
  }
  if (a[on] > b[on]) {
   return 1;
  }
  return 0;
 }

 Bots.sortTopVoted = function() {
  return AllBots.sort((a, b) => compare(a, b, "votes")).reverse().slice(0, 9);
 }

 Bots.findOneById = function(q) {
  return AllBots[AllBots.findIndex(b => b.id == q)];
 }
 
 Bots.refreshOne = function(id) {
  var bot = Bots.findOneById(id);
  bots.findOne({ id }).then(botu => bot = botu);
 }

 Bots.findOneByCode = function(q) {
  return AllBots[AllBots.findIndex(b => b.code == q)];
 }

 Bots.findOneByBoth = function(q, c) {
  return AllBots[AllBots.findIndex(b => (b.id == q && b.code === c))];
 }

 Bots.clean = function(arg) {
  const { _id, code, ...bot } = arg;
  return bot;
 }

 Bots.findOneByOwner = function(id) {
  return AllBots[AllBots.findIndex(b => b.owners.includes(id))];
 }
 
 Bots.findByOwner = function (id){
  return AllBots.map((bot, index)=>{
if(bot.owners.includes(id)){return bot}}).filter(Boolean);
 }
})();