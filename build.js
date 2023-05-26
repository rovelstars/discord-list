const shell = require("shelljs"); // Import the shelljs module for executing shell commands
const rovel = require("rovel.js"); // Import the rovel.js module
rovel.env.config(); // Configure environment variables using rovel.js
const fs = require("fs"); // Import the fs module for file system operations
const pkg = require("./package.json"); // Import the package.json file

// Check Node.js version and exit if it is greater than V18
if (process.version.split(".")[1] > 18) {
  process.exit(0);
}

// Check if cache check is enabled in package.json and force flag is not present in command-line arguments
if (pkg.checkCache == "true" && !process.argv.join(" ").includes("--force")) {
  try {
    // Check if build cache exists
    if (fs.existsSync("./src/public/assets/img/bot/logo-36.png")) {
      console.log("Build cache was found. Skipping build.");
    } else {
      shell.exec("chmod +x run.sh && ./run.sh"); // Run the run.sh script
    }
  } catch (err) {
    console.error(err);
  }
} else {
  console.log("Running build without checking cache.");
  shell.exec("chmod +x run.sh && ./run.sh"); // Run the run.sh script
}
