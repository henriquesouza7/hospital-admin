import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;
const hasStorageState = Boolean(storageState && existsSync(storageState));
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const administrativeRoutes = [
  "/",
  "/configuracoes",
  "/financeiro",
  "/financeiro/farmacia",
  "/financeiro/laboratorio",
  "/internacoes",
  "/internacoes/lancamentos",
  "/internacoes/medicos",
  "/internacoes/metas",
  "/producao",
  "/producao/indicadores",
  "/pequenas-cirurgias",
];

async function expectGeistTypography(page: import("@playwright/test").Page) {
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const selectors = ["html", "body", "h1", "button", "input", "table"];
    const computed = Object.fromEntries(
      selectors.map((selector) => {
        const element = document.querySelector(selector);
        return [
          selector,
          element ? getComputedStyle(element).fontFamily : null,
        ];
      }),
    );
    return {
      computed,
      fontStatus: document.fonts.status,
      geistLoaded: document.fonts.check("16px Geist"),
      fontAssets: performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes(".woff2"))
        .map((entry) => new URL(entry.name).pathname),
    };
  });

  expect(result.fontStatus).toBe("loaded");
  expect(result.geistLoaded).toBe(true);
  expect(result.fontAssets.length).toBeGreaterThan(0);
  for (const [element, fontFamily] of Object.entries(result.computed)) {
    if (!fontFamily) continue;
    expect(fontFamily.toLowerCase(), element + " font").toContain("geist");
    expect(fontFamily.toLowerCase()).not.toMatch(/times new roman|serif/);
  }
}

test("should_load_geist_on_public_auth_pages_at_supported_widths", async ({
  page,
}) => {
  for (const { width, height } of viewports) {
    await page.setViewportSize({ width, height });
    for (const route of ["/login", "/login/forgot-password"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expectGeistTypography(page);
    }
  }
});

test.describe("authenticated application typography", () => {
  test.skip(
    !hasStorageState,
    "Configure uma sessão administrativa real em PLAYWRIGHT_AUTH_STORAGE_STATE para validar as rotas protegidas.",
  );
  test.use({ storageState: storageState ?? undefined });

  test("should_keep_geist_on_administrative_routes_at_supported_widths", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    for (const { width, height } of viewports) {
      await page.setViewportSize({ width, height });
      for (const route of administrativeRoutes) {
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator("main h1")).toBeVisible();
        await expectGeistTypography(page);
      }
    }
  });
});
