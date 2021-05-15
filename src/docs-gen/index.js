const fs = require('fs');
const matter = require('gray-matter');
var Files = fs.readdirSync(__dirname + '/docs').filter(file => file.endsWith('.md'));
let ci = 0;
let cj = Files.length;
for (var file of Files) {
 const text = fs.readFileSync(`${__dirname}/docs/${file}`,'utf8');
 const build = matter(text);
 ci += 1;
 console.log(`[DOCS] Page Generated - ${file} (${ci}/${cj})`);
 file = file.replace(".md","");
 fs.writeFileSync(`${__dirname}/build/${file}.json`, text, {falg: "a+"});
}