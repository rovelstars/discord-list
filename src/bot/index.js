const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
let i = 0;
let j = commandFiles.length;
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	i+=1;
	console.log(`[BOT] Loaded - ${file} (${i}/${j}`)
	client.commands.set(command.name, command);
}
client.once("ready", ()=>{
 console.log("[BOT] Logined as "+client.user.tag);
 
})

client.login(process.env.TOKEN);