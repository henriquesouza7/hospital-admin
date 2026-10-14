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
      "/internacoes/lancamentos",
      "/internacoes/metas",
      "/producao",
      "/producao/lancamentos",
      "/producao/indicadores",
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
            mainOverflow:
              (document.querySelector("main")?.scrollWidth ?? 0) >
              (document.querySelector("main")?.clientWidth ?? 0),
            headingOutsideViewport:
              !bounds || bounds.left < 0 || bounds.right > window.innerWidth,
          };
        });

        expect(
          layout,
          `Layout fora do viewport em ${route} (${width}px).`,
        ).toEqual({
          horizontalOverflow: false,
          mainOverflow: false,
          headingOutsideViewport: false,
        });
      }
    }

    expect(buttonSemanticsWarnings).toEqual([]);
  });

  test("should_make_horizontal_data_regions_accessible_by_keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/internacoes");

    const region = page.getByRole("region", {
      name: "Valores mensais de internações",
    });
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute("tabindex", "0");
    await expect(region).toHaveClass(/focus-visible:ring-2/);

    const dimensions = await region.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    let reachedByTab = false;
    for (let step = 0; step < 45 && !reachedByTab; step += 1) {
      await page.keyboard.press("Tab");
      reachedByTab = await region.evaluate(
        (element) => document.activeElement === element,
      );
    }
    expect(reachedByTab).toBe(true);
    const focusVisible = await region.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none"
      );
    });
    expect(focusVisible).toBe(true);

    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  });

  test("should_keep_mobile_navigation_links_visible_when_focused", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const navigation = page.getByRole("navigation", {
      name: "Navegação principal",
    });
    await page.locator("body").click({ position: { x: 2, y: 2 }, force: true });

    const focusedNavigationLinks: Array<{ href: string; visible: boolean }> =
      [];
    for (let step = 0; step < 50; step += 1) {
      await page.keyboard.press("Tab");
      const focusedLink = await navigation.evaluate((element) => {
        const active = document.activeElement;
        if (!(active instanceof HTMLAnchorElement) || !element.contains(active))
          return null;
        const bounds = active.getBoundingClientRect();
        return {
          href: active.getAttribute("href") ?? "",
          visible: bounds.left >= -1 && bounds.right <= window.innerWidth + 1,
        };
      });
      if (focusedLink) focusedNavigationLinks.push(focusedLink);
      if (
        focusedNavigationLinks.length ===
        (await navigation.getByRole("link").count())
      )
        break;
    }

    expect(focusedNavigationLinks.length).toBeGreaterThan(0);
    expect(focusedNavigationLinks.every((link) => link.visible)).toBe(true);
  });

  test("should_render_pharmacy_navigation_links_with_link_semantics", async ({
    page,
  }) => {
    const buttonWarnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        message.text().includes("nativeButton")
      ) {
        buttonWarnings.push(message.text());
      }
    });

    for (const route of [
      "/financeiro/farmacia/produtos",
      "/financeiro/farmacia/pedidos/novo",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Voltar aos pedidos" }),
      ).toBeVisible();
    }

    await expect.poll(() => buttonWarnings).toEqual([]);
  });

  test("should_keep_finance_forms_within_mobile_and_tablet_viewports", async ({
    page,
  }) => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/financeiro/farmacia/pedidos/novo",
        "/financeiro/laboratorio/pedidos/novo",
        "/financeiro/importacao-fiscal",
      ]) {
        await page.goto(route);
        await expect(page.locator("main h1")).toBeVisible();

        const layout = await page.evaluate(() => ({
          bodyWidth: document.body.scrollWidth,
          mainWidth: document.querySelector("main")?.scrollWidth ?? 0,
          mainClientWidth: document.querySelector("main")?.clientWidth ?? 0,
        }));
        expect(
          layout.bodyWidth,
          `A página ${route} excedeu ${width}px no corpo.`,
        ).toBeLessThanOrEqual(width);
        expect(
          layout.mainWidth,
          `A página ${route} excedeu a área principal em ${width}px.`,
        ).toBeLessThanOrEqual(layout.mainClientWidth);
      }
    }
  });

  test("should_keep_production_chart_legend_text_readable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();

    const legendLabels = page.locator(
      ".recharts-legend-item-text > span.text-foreground",
    );
    await expect(legendLabels.first()).toBeVisible();
    const contrastRatios = await legendLabels.evaluateAll((elements) =>
      elements.map((element) => {
        const foreground = getComputedStyle(element).color.match(/\d+/g);
        const background = [255, 255, 255];
        if (!foreground || foreground.length < 3) return 0;
        const luminance = (rgb: number[]) => {
          const channels = rgb.slice(0, 3).map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return (
            channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
          );
        };
        const text = luminance(foreground.map(Number));
        const surface = luminance(background);
        return (
          (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)
        );
      }),
    );

    expect(contrastRatios.length).toBeGreaterThan(0);
    expect(contrastRatios.every((ratio) => ratio >= 4.5)).toBe(true);
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
