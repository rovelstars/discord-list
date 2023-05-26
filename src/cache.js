(async function () {
  const bots = require("@models/bots.js");
  const users = require("@models/users.js");
  const servers = require("@models/servers.js");
  globalThis.Cache = {};
  console.log("[CACHE] Started!");

  process.emit("STARTED", {});

  function compare(a, b, on) {
    return a[on] - b[on];
  }

  globalThis.Bots = {};
  globalThis.Users = {};
  globalThis.Servers = {};

  Cache.models = { bots, users, servers };

  async function fetchAllData() {
    Cache.AllBots = await bots.find();
    Cache.AllUsers = await users.find();
    Cache.AllServers = await servers.find();
  }

  await fetchAllData();

  Cache.Bots = {
    findOne: async function (obj) {
      return obj ? AllBots.find((bot) => Object.entries(obj).every(([key, value]) => bot[key] == value)) : AllBots[0];
    },
    find: async function (obj) {
      return obj ? AllBots.filter((bot) => Object.entries(obj).every(([key, value]) => bot[key] == value)) : AllBots;
    },
    sortNewAdded: function () {
      return [...AllBots].filter((b) => b.added).reverse().slice(0, 10);
    },
    sortTopVoted: function () {
      return [...AllBots].sort((a, b) => compare(a, b, "votes")).reverse().slice(0, 9);
    },
    findOneById: function (id) {
      return AllBots.find((bot) => bot.id == id);
    },
    refreshOne: function (id) {
      Cache.models.bots.findOne({ id }).then((botu) => {
        if (botu) {
          AllBots[AllBots.findIndex((bot) => bot.id == id)] = botu;
        }
      });
    },
    refresh: async function () {
      await fetchAllData();
    },
    findOneByOwner: function (id) {
      return AllBots.find((bot) => bot.owners.includes(id));
    },
    findByOwner: function (id) {
      return AllBots.filter((bot) => bot.owners.includes(id));
    },
    importByID: function (id, message) {
      fetch(`https://top.gg/api/bots/${id}`, {
        method: "GET",
        headers: {
          Authorization: globalThis.TOPGGTOKEN(),
        },
      })
        .then((r) => r.json())
        .then((bot) => {
          if (bot.error) {
            return message.reply(bot.error.toLowerCase().split(" ").join("_"));
          }
          message.reply(`Importing Bot ${bot.username}`);
          const abot = {
            id: bot.id,
            lib: bot.lib || "none",
            prefix: bot.prefix,
            short: bot.shortdesc,
            desc: bot.longdesc,
            support: bot.support,
            bg: bot.bannerUrl,
            owners: bot.owners,
            invite: bot.invite,
            github: bot.github,
            website: bot.website,
            imported: "Backup DB",
          };
          fetch(`${process.env.DOMAIN}/api/bots/new`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(abot),
          })
            .then((r) => r.json())
            .then((d) => {
              message.reply(`\`\`\`\n${d}\n\`\`\``);
              this.refreshOne(abot.id);
            });
        });
    },
    clean: function () {
      AllBots.filter((b) => {
        return Object.keys(b).includes("owners");
      });
    },
    deleteOne: async function (id) {
      await Cache.models.bots.findOneAndDelete({ id });
      this.refresh();
    },
  };

  Cache.Users = {
    findOne: async function (obj) {
      return obj ? AllUsers.find((user) => Object.entries(obj).every(([key, value]) => user[key] == value)) : AllUsers[0];
    },
    find: async function (obj) {
      return obj ? AllUsers.filter((user) => Object.entries(obj).every(([key, value]) => user[key] == value)) : AllUsers;
    },
    sortNewAdded: function () {
      return [...AllUsers].filter((u) => u.added).reverse().slice(0, 10);
    },
    sortTopVoted: function () {
      return [...AllUsers].sort((a, b) => compare(a, b, "votes")).reverse().slice(0, 9);
    },
    findOneById: function (id) {
      return AllUsers.find((user) => user.id == id);
    },
    refreshOne: function (id) {
      Cache.models.users.findOne({ id }).then((useru) => {
        if (useru) {
          AllUsers[AllUsers.findIndex((user) => user.id == id)] = useru;
        }
      });
    },
    refresh: async function () {
      await fetchAllData();
    },
    deleteOne: async function (id) {
      await Cache.models.users.findOneAndDelete({ id });
      this.refresh();
    },
  };

  Cache.Servers = {
    findOne: async function (obj) {
      return obj ? AllServers.find((server) => Object.entries(obj).every(([key, value]) => server[key] == value)) : AllServers[0];
    },
    find: async function (obj) {
      return obj ? AllServers.filter((server) => Object.entries(obj).every(([key, value]) => server[key] == value)) : AllServers;
    },
    sortNewAdded: function () {
      return [...AllServers].filter((s) => s.added).reverse().slice(0, 10);
    },
    sortTopVoted: function () {
      return [...AllServers].sort((a, b) => compare(a, b, "votes")).reverse().slice(0, 9);
    },
    findOneById: function (id) {
      return AllServers.find((server) => server.id == id);
    },
    refreshOne: function (id) {
      Cache.models.servers.findOne({ id }).then((serveru) => {
        if (serveru) {
          AllServers[AllServers.findIndex((server) => server.id == id)] = serveru;
        }
      });
    },
    refresh: async function () {
      await fetchAllData();
    },
    deleteOne: async function (id) {
      await Cache.models.servers.findOneAndDelete({ id });
      this.refresh();
    },
  };

  module.exports = { Bots, Users, Servers };
})();
