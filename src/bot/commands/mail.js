if(message.channel.type=="DM"){
 if(args.length==0){
  message.reply({content: "Please send your message to mail."});
 }
 else{
  message.reply({content:"📨 Successfully Mailed The Team!"});
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
    color: "#57F287",
    img: message.author.avatarURL(),
    attachment: (at.length!=0)?at[0]:null
   })
  })
 }
}
else{
 message.reply({content: "This command can be executed only in DMs. Don't you ever care about your privacy? 🤨});
}