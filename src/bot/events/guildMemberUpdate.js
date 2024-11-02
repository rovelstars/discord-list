client.on("guildMemberUpdate", (olduser, newuser) => {
  if (newuser.bot) {
    try {
      Cache.Bots.findOne({ id: newuser.id }).then((bot) => {
        if (!bot) return;
        if (bot.username != newuser.username) {
          bot.username = newuser.username;
        }
        if (bot.avatar != newuser.avatar) {
          bot.avatar = newuser.avatar;
        }
        if (bot.discriminator != newuser.discriminator) {
          bot.discriminator = newuser.discriminator;
        }
        if (bot.status != newuser.presence?.status) {
          bot.status = newuser.presence?.status;
        }
        bot.save();
      });
    } catch (e) {}
  } else if (!newuser.bot) {
    Users.findOne({ id: newuser.id }).then((user) => {
      if (!user) {
      } else {
        fetch(`${process.env.DOMAIN}/api/client/users/${user.id}`)
          .then((r) => r.json())
          .then((u) => {
            if (
              u.avatar === user.avatar &&
              u.username === user.username &&
              u.discriminator === user.discriminator
            ) {
            } else {
              if (u.avatar !== user.avatar) {
                user.avatar = u.avatar;
              }
              if (u.username !== user.username) {
                user.username = u.username;
              }
              if (u.discriminator !== user.discriminator) {
                user.discriminator = u.discriminator;
              }
              user.save();
            }
          });
      }
    });
  }
});
