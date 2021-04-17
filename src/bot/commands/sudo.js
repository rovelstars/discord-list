if(client.owners.includes(message.author.id)){
 const mem = getMention(args[0]);
 if(!mem){
  message.reply("Invalid User");
 }
 else{
 message.content = `${args.length ? ` ${args.join(" ")}`: `${prefix}`}`
 message.author = mem;
 message.channel.send(`Running as **SUDO** [${message.author.tag}] \`${message.content}\``);
 if (message.content.startsWith(prefix) || !message.author.bot){
	args = message.content.slice(prefix.length).trim().split(/ +/);
	command = args.shift().toLowerCase();
	cmd = searchCommand(command);
	try{
	if(!cmd){message.reply("That command Doesn't exist!");}
	else eval(cmd.code);
	} catch(e){
	  message.reply(`An Error Occured!\n\`\`\`\n${e}\n\`\`\``)
	}
 }
}
}
else{
 message.reply("You're not even a owner, asking for sudo perms lmao!");
}