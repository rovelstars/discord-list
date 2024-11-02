export {
  apps: [
    {
      name: "main",
      script: "src/index.js",
      watch: ["src", "package.json"],
      // Delay between restart
      kill_timeout: 10000,
      watch_delay: 5000,
      exec_mode: "cluster",
      instances: "max",
      ignore_watch: [
        ".git",
        "rdl",
        "src/public/*",
        "sdk.js",
        "README.md",
        "TODO.md",
      ],
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
};
