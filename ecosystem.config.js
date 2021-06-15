module.exports = {
  apps: [{
    name: "main",
    script: "src/index.js",
    watch: ["src","node_modules"],
    // Delay between restart
    watch_delay: 1000,
    ignore_watch : [".git", "rdl", "src/public", "sdk.js", "README.md", "TODO.md"],
    watch_options: {
      "followSymlinks": false
    }
  }]
}