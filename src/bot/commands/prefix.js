module.exports = {
	name: 'prefix',
	description: 'Get prefix of a bot from RDL',
	execute(message, args, fetch, getMention, client) {
	 if(!args) return message.reply("Do you want your own prefix? Lmao");
	 
if(args){
	 let id = getMention(args[0]);
		fetch("https://bots.rovelstars.ga/bots/"+id).then(r=>r.json()).then(d=>{
		 if(d.err) return message.reply("An Error Occurred!");
		 message.reply(`${args[0]}'s prefix is: \`${d.prefix}\``)})
}
	},
};