if(message.channel.type=="dm"){
 if(args.length==0){
  message.reply("Please send your message to mail.");
 }
 else{
  message.reply("📨 Successfully Mailed The Team!");
  const at = (message.attachments).array();
  
  fetch(`${process.env.DOMAIN}/api/client/log`,{
   method: "POST",
   headers: {
    "content-type": "application/json"
   },
   body: JSON.stringify({
    secret: process.env.SECRET,
    channel: "838067036080963584",
    title: `[MAIL] Incoming 📥`,
    desc: `**From:** ${message.author.tag} (${message.author.id})\n\n**Message:**\n${args.join(" ")}`,
    color: "green",
    img: message.author.avatarURL(),
    attachment: (at.length!=0)?at[0]:null
   })
  })
 }
}
else{
 message.reply("This command can be executed only in DMs. Don't you ever care about your privacy? 🤨");
}