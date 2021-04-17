const cheerio = require("cheerio");
let language = args.shift();
let text = args;
if(!language) return msg.send("What language am I supposed to translate to?");
    if(language.length !== 2) return msg.send("Language must be the 2 letter alias. E.g `French` -> `fr`");
    if(!text.length) return msg.send("What am I supposed to translate?");

    const $ = await fetch(`http://translate.google.com/m?hl=${language}&sl=auto&q=${encodeURIComponent(text.join(" "))}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36" }
    })
      .then((res) => res.text())
      .then((html) => cheerio.load(html));

    const results = $("div.t0").first().text();
    const lang = $("div a.s1").next().next().first().text();

    const embed = new Discord.MessageEmbed()
      .setTitle("Translated")
      .addField("Original Text", "```\n" + text.join(" ") + "```")
      .addField("Translated Text", `Language: ${lang}\n` + "```\n" + results + "```")
      .setFooter(`Requested by ${message.author.tag}`);
    message.channel.send(embed);