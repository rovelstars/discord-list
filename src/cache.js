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
 
 /*idk why all the documents returned are in reverse order.*/

 Bots = {};

 Cache.AllBots = await AllBots;
 Cache.AllUsers = await AllUsers;
 Cache.AllServers = await AllServers;
 Cache.models = { bots, users, servers };
 Cache.Bots = Bots;

 Bots.findOne = async function(obj) {
  if (!obj) {
   return AllBots[0];
  }
  else if(Object.keys(obj).length === 0 && obj.constructor === Object){
   return AllBots[0];
  }
  else {
   var arr = [];
   for (const [key, value] of Object.entries(obj)) {
    arr.push(AllBots.map((bot, index) => {
     if (bot[key] == value) { return bot }
    }).filter(Boolean));
   }
   return [...new Set(arr)][0][0];
  }
 }

 Bots.find = async function(obj) {
  if (!obj) {
   return AllBots;
  }
  else if(Object.keys(obj).length === 0 && obj.constructor === Object){
   return AllBots;
  }
  else {
   var arr = [];
   for (const [key, value] of Object.entries(obj)) {
    arr.push(AllBots.map((bot, index) => {
     if (bot[key] == value) { return bot }
    }).filter(Boolean));
   }
   return [...new Set(arr)][0]; //without 0: [[{bot}]]
  }
 }

 Bots.sortNewAdded = function() {
  return [...AllBots].slice(0, 9); //idk we dont we need to reverse!?!
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
  Cache.models.bots.findOne({ id }).then(botu => bot = botu);
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

 Bots.findByOwner = function(id) {
  return AllBots.map((bot, index) => {
   if (bot.owners.includes(id)) { return bot }
  }).filter(Boolean);
 }
 
 Bots.deleteOne = function(bot, callback){
  let err=undefined;
  if (!obj) {
   return undefined;
  }
  else if(Object.keys(obj).length === 0 && obj.constructor === Object){
   return undefined;
  }
  else{
  Cache.models.bots.deleteOne(bot, callback);
  deletedbot = Cache.Bots.findOne(bot);
  const i = AllBots.findIndex(b=>b==deletedbot);
  if(i > -1){
   return AllBots.splice(i, 1);
  }
  else{
   return undefined;
  }
 }
 }
})();