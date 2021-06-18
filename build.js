const shell = require("shelljs");
const fs = require("fs");
const pkg = require("./package.json");
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