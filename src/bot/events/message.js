client.on("message", message=>{
 if(message.content.startsWith("https://discord.com/channels/")){
  message.content = message.content.replace("https://discord.com/channels/","");
  const ar = message.content.split("/");
  //[guid,chid,msgid]
  try{
   const guid = ar[0];
   const chid = ar[1];
   const msgid = ar[2];
   message.reply(ar.join(","));
  }
  catch(e){
   
  }
 }
  if (!message.content.startsWith(prefix) || message.author.bot) return;
	let args = message.content.slice(prefix.length).trim().split(/ +/);
	let command = args.shift().toLowerCase();
	if(command==""|| !command) message.reply("What do you want?");
	else if(command=="reload"){
	 if(message.content.includes("--force")){
	  if(!client.owners.include(message.author.id)){
	   message.reply("You're not a owner, so you can't force me.");
	  }
	  else{
	   reload();
	   message.reply("**Force** Reloading Commands and Events!");
	  }
	 }
	 else {
	 let cdm = searchCommand("help");
	 if(!cdm){
	 message.reply("Reloading Commands and Events!");
	 reload();
	 }
	 else {
	  message.reply("I think the commands are already there. Use `--force` to force reload!");
	 }}
	}
	else{
	let cmd = searchCommand(command);
	try{
	if(!cmd) return message.reply("That command Doesn't exist!");
	else eval(cmd.code);
	} catch(e){
	  message.reply(`An Error Occured!\n\`\`\`\n${e}\n\`\`\``)
	}}
});