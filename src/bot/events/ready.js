client.once('ready', () => {
 console.log(`[BOT] Logined as ${client.user.tag}`);
 client.guilds.cache.get("602906543356379156").channels.cache.get("775231877433917440").send(`>>> Rovel Discord List has Started!\nWith ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`)
});