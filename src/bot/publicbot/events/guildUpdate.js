client.on("guildUpdate", (oldg, newg) => {
  Cache.models.servers.findOne({ id: newg.id }).then((server) => {
    if (server) {
      server.name = newg.name;
      server.icon = newg.icon;
      server.description =
        newg.description || "Short description is not Updated.";
      server.save();
    }
  });
});
