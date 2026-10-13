import { defineConfig, devices } from "@playwright/test";

const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL;
if (process.env.PLAYWRIGHT_AUTH_STORAGE_STATE && !explicitBaseURL) {
  throw new Error(
    "Defina PLAYWRIGHT_BASE_URL para executar E2E autenticado no ambiente da sessão.",
  );
}
const baseURL = explicitBaseURL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Authenticated tests refresh a shared ignored storage-state file; their
  // dashboards still test parallel requests inside the dedicated smoke.
  workers: process.env.PLAYWRIGHT_AUTH_STORAGE_STATE ? 1 : undefined,
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
