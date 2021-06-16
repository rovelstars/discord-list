module.exports = {
  apps: [{
    name: "main",
    script: "src/index.js",
    watch: ["src","package.json"],
    // Delay between restart
    watch_delay: 5000,
    exec_mode : "cluster",
    ignore_watch : [".git", "rdl", "src/public", "sdk.js", "README.md", "TODO.md"],
    watch_options: {
      "followSymlinks": false
    }
  }]
}