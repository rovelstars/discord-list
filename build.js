const shell = require("shelljs");
const rovel = require("rovel.js");
rovel.env.config();
const fs = require("fs");
const pkg = require("./package.json");
if (process.version.split(1, 3) > 18) {
  process.exit(0);
}

if (pkg.checkCache == "true" && !process.argv.join(" ").includes("--force")) {
  try {
    if (fs.existsSync("./src/public/assets/img/bot/logo-36.png")) {
      console.log("Build cache was found. Skipping build.");
    } else {
      shell.exec("chmod +x run.sh && ./run.sh");
    }
  } catch (err) {
    console.error(err);
  }
} else {
  console.log("Running build without checking cache.");
  shell.exec("chmod +x run.sh && ./run.sh");
}
