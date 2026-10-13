import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseURL = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3006",
);
const storageStatePath = resolve(
  process.env.PLAYWRIGHT_AUTH_STORAGE_STATE ?? "tests/e2e/.auth/admin.json",
);

if (
  !["localhost", "127.0.0.1", "[::1]"].includes(baseURL.hostname) ||
  baseURL.protocol !== "http:"
) {
  throw new Error("A captura de sessão deve apontar para localhost via HTTP.");
}

await mkdir(dirname(storageStatePath), { recursive: true });

const browser = await chromium.launch({ headless: false });

try {
  if (existsSync(storageStatePath)) {
    const existingContext = await browser.newContext({
      storageState: storageStatePath,
    });
    const existingPage = await existingContext.newPage();
    const hasAdminDashboard = await hasFinanceAdmin(existingPage);

    if (hasAdminDashboard) {
      await existingContext.storageState({ path: storageStatePath });
      process.stdout.write("Sessão administrativa existente reutilizada.\n");
      await existingContext.close();
    } else {
      await existingContext.close();
      await captureManualSession();
    }
  } else {
    await captureManualSession();
  }
} finally {
  await browser.close();
}

async function captureManualSession() {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await page.goto(new URL("/login", baseURL).toString());
    process.stdout.write(
      `Faça login administrativo real na janela aberta em ${baseURL.origin}.\n`,
    );
    await page.waitForURL((url) => url.pathname !== "/login", { timeout: 0 });

    if (!(await hasFinanceAdmin(page))) {
      throw new Error(
        "A sessão autenticada não tem acesso administrativo ao Financeiro.",
      );
    }

    await context.storageState({ path: storageStatePath });
    process.stdout.write("Sessão administrativa salva localmente.\n");
  } finally {
    await context.close();
  }
}

async function hasFinanceAdmin(page) {
  await page.goto(new URL("/financeiro/indicadores", baseURL).toString());
  return page
    .getByRole("heading", {
      level: 1,
      name: "Indicadores e comparativos",
      exact: true,
    })
    .isVisible()
    .catch(() => false);
}
