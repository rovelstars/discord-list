module.exports = {
	name: 'info',
	description: 'Get info about a bot from RDL',
	execute(message, args, fetch) {
	 function getMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return client.users.cache.get(mention);
	}
}
if(args){
	 let id = getMention(args[0]);
		fetch("https://bots.rovelstars.ga/bots/"+id).then(r=>r.json()).then(d=>{
		 if(d.err) return message.reply("An Error Occurred!");
		 message.reply(`${args[0]}'s prefix is: \`${d.prefix}\``)})
}
if(!args) message.reply("Do you want your own prefix? Lmao");
	},
};