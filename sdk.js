/* temporary coding area*/

Cache.AllBots.filter(e=>!e.owned).forEach(bot=>{
 fetch(`https://top.gg/api/bots/${bot.id}`, {
    method: "GET",
    headers: {
      Authorization: `${globalThis.TOPGGTOKEN()}`,
    },
  }).then(r=>r.json()).then(res=>{
   bot.owners=res.owners;
   bot.save();
   console.log(`Updated ${bot.username}`);
});
});