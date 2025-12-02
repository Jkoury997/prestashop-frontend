module.exports = {
  apps: [
    {
      name: "ecommerce-metrics",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 12000",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
