if (!client.owners.some(x => x === message.author.id)) {
   message.channel.send("Oi! You are denied to use this function!");
  }
  if (client.owners.some(x => x === message.author.id)) {
   try {
    let danger=[];
    let codein = args.join(" ");
    if (danger.some(word => codein.includes(word))) {
     message.channel.send('Nani?!\nYou aren\'t allowed to get secrets.');
    }
    else {
    //console.log(message.author.tag + ' used eval function')
    let code = eval(codein);
    if (typeof code !== 'string')
     code = require('util').inspect(code, { depth: 0 });
     if(code==process.env.TOKEN){
      code="Fool!\nI'm intelligent too <:smart:794453219605610509>"
     }
     message.channel.send("**Evaluation**\n📥 **INPUT**\n```\n"+codein+"\n```\n📤 **OUTPUT**\n");
     if(code.length <='1990'){
     message.channel.send("```js\n"+code+"\n```");
     }

    if (code.length >= '1990') {
     code = code.slice(0,1990).concat("\n...");
     message.channel.send("```js\n"+code+"\n```");
    }
    }
   } catch (e) {
    message.channel.send(`\`\`\`js\n${e}\n\`\`\``);
   }
  }