import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175/physics-experiment-recorder/",
    browserName: "chromium",
    launchOptions: {
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
});
