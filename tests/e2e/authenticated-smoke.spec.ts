import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;
const hasStorageState = Boolean(storageState && existsSync(storageState));

test.describe("smokes administrativos autenticados", () => {
  test.skip(
    !hasStorageState,
    "Exporte uma sessão administrativa real para PLAYWRIGHT_AUTH_STORAGE_STATE; não há login automatizado neste smoke.",
  );
  test.use({ storageState: storageState ?? undefined });

  test("should_render_administrative_dashboard_with_a_real_admin_session", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Painel administrativo" }),
    ).toBeVisible();
    await expect(
      page.locator("article").filter({ hasText: "Gastos registrados" }),
    ).toContainText(/R\$/);
  });

  test("should_keep_dashboard_available_for_concurrent_authenticated_requests", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageState ?? undefined,
    });
    const pages = await Promise.all([context.newPage(), context.newPage()]);

    try {
      await Promise.all(pages.map((page) => page.goto("/")));
      for (const page of pages) {
        await expect(page).not.toHaveURL(/\/login/);
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "Painel administrativo",
          }),
        ).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });

  test("should_render_audit_filters_with_a_real_admin_session", async ({
    page,
  }) => {
    await page.goto("/auditoria");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Auditoria" }),
    ).toBeVisible();
    await expect(page.getByLabel("Módulo")).toBeVisible();
  });

  test("should_keep_admissions_dashboard_within_supported_viewports", async ({
    page,
  }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto("/internacoes");
      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Dashboard" }),
      ).toBeVisible();

      const layout = await page.evaluate(() => {
        const heading = document.querySelector("main h1");
        const bounds = heading?.getBoundingClientRect();
        return {
          horizontalOverflow:
            document.documentElement.scrollWidth > window.innerWidth,
          headingOutsideViewport:
            !bounds || bounds.left < 0 || bounds.right > window.innerWidth,
        };
      });

      expect(layout).toEqual({
        horizontalOverflow: false,
        headingOutsideViewport: false,
      });
    }
  });

  test("should_download_aggregate_csv_reports_with_a_real_admin_session", async ({
    page,
  }) => {
    await page.goto("/exportacoes");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Exportações CSV" }),
    ).toBeVisible();

    for (const reportType of ["gastos", "cirurgias"]) {
      await page.getByLabel("Relatório").selectOption(reportType);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Baixar CSV" }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    }
  });

  test("should_render_minor_surgery_administration_without_patient_data", async ({
    page,
  }) => {
    await page.goto("/pequenas-cirurgias");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Pequenas cirurgias" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Criar dia de cirurgia" }),
    ).toBeVisible();
  });
});
