(async function () {
  bots = require("@models/bots.js");
  users = require("@models/users.js");
  servers = require("@models/servers.js");
  globalThis.Cache = {};
  console.log("[CACHE] Started!");

  process.emit("STARTED", {});

  function compare(a, b, on) {
    if (a[on] < b[on]) {
      return -1;
    }
    if (a[on] > b[on]) {
      return 1;
    }
    return 0;
  }

  /*only Arrays, Objects, Functions are referenced.
 Others are not*/

  AllBots = await bots.find();
  AllUsers = await users.find();
  AllServers = await servers.find();

  /*idk why all the documents returned are in reverse order.*/

  globalThis.Bots = {};
  globalThis.Users = {};
  globalThis.Servers = {};

  Cache.AllBots = await AllBots;
  Cache.AllUsers = await AllUsers;
  Cache.AllServers = await AllServers;
  Cache.models = { bots, users, servers };

  Cache.Bots = Bots;

  Bots.findOne = async function (obj) {
    if (!obj) {
      return AllBots[0];
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllBots[0];
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllBots.map((bot, index) => {
            if (bot[key] == value) {
              return bot;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0][0];
    }
  };

  Bots.find = async function (obj) {
    if (!obj) {
      return AllBots;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllBots;
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllBots.map((bot, index) => {
            if (bot[key] == value) {
              return bot;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0]; //without 0: [[{bot}]]
    }
  };

  Bots.sortNewAdded = function () {
    return [...AllBots]
      .filter((b) => {
        return b.added;
      })
      .reverse()
      .slice(0, 10); //idk we dont we need to reverse!?!
  };

  Bots.sortTopVoted = function () {
    return [...AllBots]
      .sort((a, b) => compare(a, b, "votes"))
      .reverse()
      .slice(0, 9);
  };

  Bots.findOneById = function (q) {
    return AllBots[AllBots.findIndex((b) => b.id == q)];
  };

  Bots.refreshOne = function (id) {
    var bot = Bots.findOneById(id);
    Cache.models.bots.findOne({ id }).then((botu) => (bot = botu));
  };

  Bots.refresh = async function () {
    Cache.AllBots = await bots.find();
    AllBots = Cache.AllBots;
  };

  Bots.findOneByCode = function (q) {
    return AllBots[AllBots.findIndex((b) => b.code == q)];
  };

  Bots.findOneByBoth = function (q, c) {
    return AllBots[AllBots.findIndex((b) => b.id == q && b.code === c)];
  };

  Bots.clean = function (arg) {
    if (arg == undefined) {
      return { err: "not_found" };
    } else {
      const { _id, code, webhook, ...bot } = arg._doc;
      bot.addedAt=_id;
      return bot;
    }
  };

  Bots.findOneByOwner = function (id) {
    var arr = [];
    arr.push(
      AllBots.map((bot, index) => {
        if (bot.owners.includes(id)) {
          return bot;
        }
      }).filter(Boolean)
    );
    return [...new Set(arr)][0][0];
  };

  Bots.findByOwner = function (id) {
    return AllBots.map((bot, index) => {
      if (bot.owners.includes(id)) {
        return bot;
      }
    }).filter(Boolean);
  };

  Bots.deleteOne = function (obj, callback) {
    let err = undefined;
    if (!obj) {
      return undefined;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return undefined;
    } else {
      Cache.models.bots.deleteOne(obj, callback);
      Cache.Bots.findOne(obj).then((deletedbot) => {
        const i = AllBots.findIndex((b) => b == deletedbot);
        if (i > -1) {
          return AllBots.splice(i, 1);
        } else {
          return undefined;
        }
      });
    }
  };

  Cache.Users = Users;

  Users.findOne = async function (obj) {
    if (!obj) {
      return AllUsers[0];
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllUsers[0];
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllUsers.map((user, index) => {
            if (user[key] == value) {
              return user;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0][0];
    }
  };

  Users.find = async function (obj) {
    if (!obj) {
      return AllUsers;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllUsers;
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllUsers.map((user, index) => {
            if (user[key] == value) {
              return user;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0]; //without 0: [[{bot}]]
    }
  };

  Users.sortNewAdded = function () {
    return [...AllUsers].reverse().slice(0, 9); //idk we dont we need to reverse!?!
  };

  Users.sortTopVoted = function () {
    return [...AllUsers]
      .sort((a, b) => compare(a, b, "votes"))
      .reverse()
      .slice(0, 9);
  };

  Users.findOneById = function (q) {
    return AllUsers[AllUsers.findIndex((b) => b.id == q)];
  };

  Users.refreshOne = function (id) {
    var user = Users.findOneById(id);
    Cache.models.bots.findOne({ id }).then((botu) => (user = botu));
  };

  Users.refresh = async function () {
    Cache.AllUsers = await users.find();
    AllUsers = Cache.AllUsers;
  };

  Users.clean = function (arg) {
    if (arg == undefined) {
      return { err: "not_found" };
    } else {
      const { _id, email, address, ...user } = arg._doc;
      return user;
    }
  };

  Users.deleteOne = function (obj, callback) {
    let err = undefined;
    if (!obj) {
      return undefined;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return undefined;
    } else {
      Cache.models.users.deleteOne(obj, callback);
      Cache.Users.findOne(obj).then((deleteduser) => {
        const i = AllUsers.findIndex((b) => b == deleteduser);
        if (i > -1) {
          return AllUsers.splice(i, 1);
        } else {
          return undefined;
        }
      });
    }
  };

  Cache.Servers = Servers;

  Servers.findOne = async function (obj) {
    if (!obj) {
      return AllServers[0];
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllServers[0];
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllServers.map((server, index) => {
            if (server[key] == value) {
              return server;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0][0];
    }
  };

  Servers.find = async function (obj) {
    if (!obj) {
      return AllServers;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return AllServers;
    } else {
      var arr = [];
      for (const [key, value] of Object.entries(obj)) {
        arr.push(
          AllServers.map((server, index) => {
            if (server[key] == value) {
              return server;
            }
          }).filter(Boolean)
        );
      }
      return [...new Set(arr)][0]; //without 0: [[{bot}]]
    }
  };

  Servers.sortNewAdded = function () {
    return [...AllServers].reverse().slice(0, 9); //idk we dont we need to reverse!?!
  };

  Servers.sortTopVoted = function () {
    return [...AllServers]
      .sort((a, b) => compare(a, b, "votes"))
      .reverse()
      .slice(0, 9);
  };

  Servers.findOneById = function (q) {
    return AllServers[AllServers.findIndex((b) => b.id == q)];
  };

  Servers.refreshOne = function (id) {
    var server = Servers.findOneById(id);
    Cache.models.servers.findOne({ id }).then((botu) => (server = botu));
  };

  Servers.refresh = async function () {
    Cache.AllServers = await servers.find();
    AllServers = Cache.AllServers;
  };

  Servers.clean = function (arg) {
    if (arg == undefined) {
      return { err: "not_found" };
    } else {
      const { _id, email, address, ...server } = arg._doc;
      return server;
    }
  };

  Servers.deleteOne = function (obj, callback) {
    let err = undefined;
    if (!obj) {
      return undefined;
    } else if (Object.keys(obj).length === 0 && obj.constructor === Object) {
      return undefined;
    } else {
      Cache.models.servers.deleteOne(obj, callback);
      Cache.Servers.findOne(obj).then((deletedserver) => {
        const i = AllServers.findIndex((b) => b == deletedserver);
        if (i > -1) {
          return AllServers.splice(i, 1);
        } else {
          return undefined;
        }
      });
    }
  };
})();
