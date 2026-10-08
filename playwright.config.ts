import { defineConfig, devices } from "@playwright/test";

const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = explicitBaseURL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: explicitBaseURL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
});
