import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: "html",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5188/chess/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-viewport",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5188 --strictPort",
    reuseExistingServer: false,
    url: "http://127.0.0.1:5188/chess/",
  },
});
