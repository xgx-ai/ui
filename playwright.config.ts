import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const bunBin =
  process.env.BUN_BIN ??
  (existsSync("./node_modules/.bin/bun") ? "./node_modules/.bin/bun" : "bun");
const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, value]) => key !== "FORCE_COLOR" && key !== "NO_COLOR" && value !== undefined,
  ),
);
const demoPort = process.env.PLAYWRIGHT_DEMO_PORT ?? "5175";
const demoUrl = `http://localhost:${demoPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: demoUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `${bunBin} --port=${demoPort} ./demo/index.html`,
    env: webServerEnv,
    url: demoUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
});
