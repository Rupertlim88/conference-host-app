import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// The tests sign in through the backend, so they need the same settings as the app.
nextEnv.loadEnvConfig(import.meta.dirname);

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  use: { baseURL, trace: "retain-on-failure" },
  reporter: [["list"]],
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "computer", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run start", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 90_000 },
});
