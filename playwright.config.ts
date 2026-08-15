import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results",
  reporter: process.env.CI ? "github" : "list",
  testDir: "test/e2e",
  use: {
    trace: "retain-on-failure",
  },
});
