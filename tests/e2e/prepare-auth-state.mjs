import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3003";
const storageStatePath = resolve("tests/e2e/.auth/admin.json");

await mkdir(dirname(storageStatePath), { recursive: true });

const browser = await chromium.launch({ headless: false });

try {
  const page = await browser.newPage();
  await page.goto(new URL("/login", baseURL).toString());
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 0 });
  await page
    .getByRole("heading", {
      level: 1,
      name: "Painel administrativo",
      exact: true,
    })
    .waitFor({ state: "visible", timeout: 0 });
  await page.context().storageState({ path: storageStatePath });
  process.stdout.write("Sessão Playwright salva localmente.\n");
} finally {
  await browser.close();
}
