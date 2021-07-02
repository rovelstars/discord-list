const shell = require("shelljs");
const fs = require("fs");
const pkg = require("./package.json");
name = [
  'h', 't', 't', 'p', 's', ':',
  '/', '/', 'd', 'i', 's', 'c',
  'o', 'r', 'd', '.', 'r', 'o',
  'v', 'e', 'l', 's', 't', 'a',
  'r', 's', '.', 'c', 'o', 'm'
].join("");
if(process.env.DOMAIN!=name||!process.env.DOMAIN.includes(['l', 'o', 'c','a', 'l', 'h','o', 's', 't'].join(""))){
 process.exit("done");
}
if(pkg.checkCache=="true"){
try {
  if (fs.existsSync("./src/public/assets/img/bot/logo-36.png")) {
    console.log("Build cache was found. Skipping build.");
  }
  else{
   shell.exec("chmod +x run.sh && ./run.sh");
  }
} catch(err) {
  console.error(err)
}
}
else{
 console.log("Running build without checking cache.");
 shell.exec("chmod +x run.sh && ./run.sh");
}