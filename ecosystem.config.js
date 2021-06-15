module.exports = {
  apps: [{
    name: "main",
    script: "src/index.js",
    watch: true,
    // Delay between restart
    watch_delay: 1000,
    ignore_watch : [".git", "rdl", "src/public", "sdk.js", "README.md", "TODO.md"],
    watch_options: {
      "followSymlinks": false
    }
  }]
}