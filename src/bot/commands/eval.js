module.exports = {
	name: 'eval',
	description: 'Eval for owner only',
	execute(message, args) {
		if(message.author.id==602902050677981224){
		 message.channel.send(`**Evaling**\n\`\`\`\n${args}\n\`\`\``);
		 eval(args);
		}
	},
};