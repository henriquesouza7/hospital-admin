import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;
const hasStorageState = Boolean(storageState && existsSync(storageState));

test.describe("smokes administrativos autenticados", () => {
  // The suite reuses one rotating Auth storage state; concurrency is covered
  // explicitly inside the concurrent-request test below.
  test.describe.configure({ mode: "serial" });
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

  test("should_keep_administrative_dashboards_within_supported_viewports", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const buttonSemanticsWarnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        message.text().includes("nativeButton")
      ) {
        buttonSemanticsWarnings.push(message.text());
      }
    });
    const viewportHeights = new Map([
      [390, 844],
      [768, 1024],
      [1024, 900],
      [1440, 900],
    ]);
    const routes = [
      "/",
      "/auditoria",
      "/configuracoes",
      "/exportacoes",
      "/financeiro",
      "/financeiro/indicadores",
      "/financeiro/farmacia",
      "/financeiro/laboratorio",
      "/financeiro/feira",
      "/internacoes",
      "/producao",
      "/pequenas-cirurgias",
    ];

    for (const [width, height] of viewportHeights) {
      await page.setViewportSize({ width, height });
      for (const route of routes) {
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator("main h1")).toBeVisible();

        const layout = await page.evaluate(() => {
          const heading = document.querySelector("main h1");
          const bounds = heading?.getBoundingClientRect();
          return {
            horizontalOverflow: document.body.scrollWidth > window.innerWidth,
            headingOutsideViewport:
              !bounds || bounds.left < 0 || bounds.right > window.innerWidth,
          };
        });

        expect(
          layout,
          `Layout fora do viewport em ${route} (${width}px).`,
        ).toEqual({
          horizontalOverflow: false,
          headingOutsideViewport: false,
        });
      }
    }

    expect(buttonSemanticsWarnings).toEqual([]);
  });

  test("should_download_aggregate_csv_reports_with_a_real_admin_session", async ({
    page,
  }) => {
    await page.goto("/exportacoes");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Exportações CSV" }),
    ).toBeVisible();

    for (const reportType of [
      "gastos",
      "compras",
      "internacoes",
      "metas",
      "producao",
      "cirurgias",
    ]) {
      await page.getByLabel("Início").fill("2099-10");
      await page.getByLabel("Fim").fill("2099-10");
      await page.getByLabel("Relatório").selectOption(reportType);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Baixar CSV" }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      if (!downloadPath) throw new Error("O arquivo CSV não foi salvo.");
      const csv = await readFile(downloadPath, "utf8");

      expect(download.suggestedFilename()).toBe(
        `${reportType}-2099-10-2099-10.csv`,
      );
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("\r\n");
      expect(csv).not.toContain("HOMOLOGACAO TESTE - RACE");
      expect(csv).not.toContain("HOMOLOGACAO TESTE - DUPLICIDADE");

      if (reportType === "gastos" || reportType === "compras") {
        expect(csv).toContain("9999999999,99");
      }
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
