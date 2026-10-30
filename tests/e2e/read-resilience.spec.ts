import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openThroughNetlifyChallenge(page: Page, route: string) {
  let response = await page.goto(route);
  if (response?.status() === 403) {
    await expect(
      page.getByText("We are verifying your connection."),
    ).toBeVisible();
    await page.waitForTimeout(3_000);
    response = await page.goto(route);
  }
  expect(response?.status()).toBe(200);
}

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;
test("should_preserve_administrative_reads_across_renewal_and_concurrency", async ({
  browser,
}) => {
  test.skip(
    !storageState || !existsSync(storageState),
    "Sessão administrativa legítima necessária.",
  );
  test.setTimeout(240_000);
  const context = await browser.newContext({
    storageState,
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
  });
  try {
    const pages = await Promise.all(
      Array.from({ length: 3 }, () => context.newPage()),
    );
    for (let batch = 0; batch < 10; batch++) {
      if (batch === 5) {
        const renewal = await context.request.get("/api/auth/token");
        expect(renewal.ok()).toBe(true);
      }
      await Promise.all(
        pages.map(async (page) => {
          await openThroughNetlifyChallenge(page, "/");
          await expect(page.locator("main h1")).toHaveText("Visão Geral");
          await expect(page.locator("main")).not.toContainText("Indisponível");
          await expect(page.locator("main")).not.toContainText("Sem permissão");
          await expect(page.locator("main")).not.toContainText(
            "Não foi possível consultar",
          );
        }),
      );
    }
    for (const route of [
      "/financeiro",
      "/internacoes",
      "/producao",
      "/pequenas-cirurgias",
    ]) {
      await openThroughNetlifyChallenge(pages[0], route);
      await expect(pages[0].locator("main h1")).toBeVisible();
      await expect(pages[0].locator("main")).not.toContainText(
        "Não foi possível carregar",
      );
    }
  } finally {
    await context.close();
  }
});
