// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3737",
    headless: true,
    video: "on",
  },
  projects: [
    {
      name: "chrome",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command: "npx serve . -l 3737 --no-clipboard",
    port: 3737,
    reuseExistingServer: !process.env.CI,
  },
});
