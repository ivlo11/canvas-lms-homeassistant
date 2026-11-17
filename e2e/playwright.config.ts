import { defineConfig, devices } from "@playwright/test";

import { HA_URL, STORAGE_STATE } from "./src/ha";

export default defineConfig({
  testDir: "tests",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  // One Home Assistant is shared, and some tests restart it.
  workers: 1,
  fullyParallel: false,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: HA_URL,
    storageState: STORAGE_STATE,
    // Home Assistant's service worker would make requests page.route can't see.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
