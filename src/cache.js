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

 CBots = {};

 Cache.AllBots = await AllBots;
 Cache.AllUsers = await AllUsers;
 Cache.AllServers = await AllServers;
 Cache.models = { CBots, users, servers };
 Cache.Bots = CBots;

 CBots.sortNewAdded = function() {
  return AllBots.reverse().slice(0, 9);
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

 CBots.sortTopVoted = function() {
  return AllBots.sort((a, b) => compare(a, b, "votes")).reverse().slice(0, 9);
 }

 CBots.findOneById = function(q) {
  return AllBots[AllBots.findIndex(b => b.id == q)];
 }

 CBots.refreshOne = function(id) {
  var bot = CBots.findOneById(id);
  CBots.findOne({ id }).then(botu => bot = botu);
 }

 CBots.findOneByCode = function(q) {
  return AllBots[AllBots.findIndex(b => b.code == q)];
 }

 CBots.findOneByBoth = function(q, c) {
  return AllBots[AllBots.findIndex(b => (b.id == q && b.code === c))];
 }

 CBots.clean = function(arg) {
  const { _id, code, ...bot } = arg;
  return bot;
 }

 CBots.findByOwner = function(id) {
  return AllBots[AllBots.findIndex(b => b.owners.includes(id))];
 }

})();