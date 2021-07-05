window.addEventListener('DOMContentLoaded', async (event) => {
 await console.log('[RDL] Loading...');
 globalThis.botData = undefined;
 globalThis.userData = undefined;
 var RDLElements = document.querySelectorAll("[rdl]");
 var RDLElementsForBotData = RDLElements.querySelectorAll("[rdl-id]");
 RDLElementsForBotData.forEach(async ele => {
  if (!botData) {
   r = await fetch(`https://discord.rovelstars.com/api/bots/${ele["rdl-id"]}`);
   botData = await r.json();
   if (botData.err) {
    console.log("[RDL] Error! Bot is not on RDL!");
   }
   else await console.log(`[RDL] Bot is ${botData.id}`);
  }
  // the above thing done in order to stop mass api requests.
 });
 var RDLElementsForStats = RDLElements.querySelectorAll("[rdl-stats]");
 RDLElementsForStats.forEach(async ele => {
  if (ele["rdl-stats"] == "votes") {
   ele.innerText = botData.votes;
  }
  else if (ele["rdl-stats"] == "servers") {
   ele.innerText = botData.servers;
  }
  else console.log("[RDL] Error! rdl-stats=" + ele["rdl-stats"] + " isn't available.");
 });
 var RDLElementsForUser = RDLElements.querySelectorAll("[rdl-user]");
 if (RDLElementsForUser.length > 0) {
  RDLElements.querySelectorAll("[rdl-user-id]").forEach(async ele => {
   if (!userData) {
    r = await fetch(`https://discord.rovelstars.com/api/users/${ele["rdl-user-id"]}`);
    botData = await r.json();
    if (botData.err) {
     await console.log("[RDL] Error! Bot is not on RDL!");
    }
    else await console.log(`[RDL] Bot is ${botData.id}`);
   }
  });
  if (ele["rdl-user"] == "id") {
   ele.innerText = userData.id;
  }
  else if (ele["rdl-user"] == "bal") {
   ele.innerText = userData.bal;
  }
  else if(ele["rdl-user"]=="username"){
   ele.innerText = userData.username;
  }
  else if(ele["rdl-user"]=="discriminator"){
   ele.innerText = userData.discriminator;
  }
  else if(ele["rdl-user"]=="tag"){
   ele.innerText = userData.tag;
  }
  else if(ele["rdl-user"]=="avatar"){
   ele.src = userData.avatarURL;
  }
  else console.log("[RDL] Error! rdl-user=" + ele["rdl-user"] + " isn't available.");
 }
});