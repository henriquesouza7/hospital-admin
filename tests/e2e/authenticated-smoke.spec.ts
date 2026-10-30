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

  test("should_collapse_and_expand_desktop_sidebar_without_losing_navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/internacoes/medicos");
    const navigation = page.getByRole("navigation", {
      name: "Navegação principal",
    });
    const collapse = page.getByRole("button", { name: "Recolher menu" });
    await expect(collapse).toBeVisible();
    await collapse.click();
    await expect(
      page.locator(".admin-motion-safe[data-sidebar-collapsed='true']"),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Internações" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Farmácia" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Expandir menu" }).click();
    await expect(
      page.locator(".admin-motion-safe[data-sidebar-collapsed='false']"),
    ).toBeVisible();
  });

  test("should_render_record_cards_for_doctors_suppliers_and_admission_targets", async ({
    page,
  }) => {
    for (const [route, heading] of [
      ["/internacoes/medicos", "Médicos"],
      ["/financeiro/fornecedores?setor=farmacia", "Fornecedores"],
      ["/internacoes/metas", "Metas"],
    ] as const) {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator("main h1")).toContainText(heading);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(overflow, `${route} em ${width}px`).toBe(false);
      }
    }
  });

  test("should_open_existing_admission_history_from_doctor_card", async ({
    page,
  }) => {
    await page.goto("/internacoes/medicos");
    const historyLink = page
      .getByRole("link", {
        name: "Ver histórico",
      })
      .first();
    await expect(historyLink).toBeVisible();
    await historyLink.click();
    await expect(page).toHaveURL(/\/internacoes\/medicos\/[^/]+$/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lançamentos deste médico" }),
    ).toBeVisible();
  });

  test("should_keep_doctor_names_and_actions_readable_in_record_cards", async ({
    page,
  }) => {
    const card = page.locator("main ul > li").first();
    const history = page.getByRole("link", { name: "Ver histórico" }).first();
    const edit = card.locator("summary");
    const status = card.getByRole("button", { name: "Inativar" });

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/internacoes/medicos");
      await expect(card).toBeVisible();
      await expect(history).toBeVisible();

      const [historyBox, editBox, statusBox] = await Promise.all([
        history.boundingBox(),
        edit.boundingBox(),
        status.boundingBox(),
      ]);
      if (!historyBox || !editBox || !statusBox) {
        throw new Error("As ações do cartão de médico não estão visíveis.");
      }
      expect(Math.abs(historyBox.y - editBox.y)).toBeLessThan(1);
      expect(Math.abs(editBox.y - statusBox.y)).toBeLessThan(1);

      const nameTextOverflow = await card
        .locator("p.font-semibold")
        .evaluate((element) => getComputedStyle(element).textOverflow);
      expect(nameTextOverflow).not.toBe("ellipsis");
    }
  });

  test("should_render_administrative_dashboard_with_a_real_admin_session", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Visão Geral" }),
    ).toBeVisible();
    await expect(
      page.locator("article").filter({ hasText: "Financeiro" }).first(),
    ).toContainText("Total no mês");
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
            name: "Visão Geral",
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

  test("should_show_readable_audit_events_and_keyboard_details", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/auditoria");
    await expect(
      page.getByRole("heading", { name: "Histórico de alterações" }),
    ).toBeVisible();
    await expect(
      page.getByText("O que aconteceu", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Responsável", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Quando", { exact: true }).first(),
    ).toBeVisible();

    const firstEvent = page.locator("main ol > li").first();
    if (await firstEvent.count()) {
      await expect(firstEvent.locator("time")).toHaveAttribute(
        "datetime",
        /.+/,
      );
      const details = firstEvent.getByText("Ver detalhes", { exact: true });
      await details.focus();
      await page.keyboard.press("Enter");
      await expect(firstEvent.getByText("ID do registro")).toBeVisible();
    }
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
      [1920, 1080],
    ]);
    const routes = [
      "/",
      "/auditoria",
      "/configuracoes",
      "/exportacoes",
      "/financeiro",
      "/financeiro/fornecedores?setor=farmacia",
      "/financeiro/indicadores",
      "/financeiro/importacao-fiscal",
      "/financeiro/farmacia",
      "/financeiro/farmacia/fornecedores",
      "/financeiro/farmacia/produtos",
      "/financeiro/farmacia/pedidos/novo",
      "/financeiro/laboratorio",
      "/financeiro/laboratorio/produtos",
      "/financeiro/laboratorio/pedidos/novo",
      "/financeiro/feira",
      "/internacoes",
      "/internacoes/lancamentos",
      "/internacoes/medicos",
      "/internacoes/metas",
      "/producao",
      "/producao/importacoes",
      "/producao/lancamentos",
      "/producao/indicadores",
      "/producao/procedimentos",
      "/pequenas-cirurgias",
      "/pequenas-cirurgias/dias",
      "/pequenas-cirurgias/fila",
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("main h1")).toBeVisible();
      for (const [width, height] of viewportHeights) {
        await page.setViewportSize({ width, height });

        const layout = async () =>
          page.evaluate(() => {
            const heading = document.querySelector("main h1");
            const bounds = heading?.getBoundingClientRect();
            const contentBounds = document
              .querySelector(".admin-content")
              ?.getBoundingClientRect();
            const pageBounds = document
              .querySelector(".admin-content > div > :first-child")
              ?.getBoundingClientRect();
            return {
              horizontalOverflow: document.body.scrollWidth > window.innerWidth,
              mainOverflow:
                (document.querySelector("main")?.scrollWidth ?? 0) >
                (document.querySelector("main")?.clientWidth ?? 0),
              headingOutsideViewport:
                !bounds || bounds.left < 0 || bounds.right > window.innerWidth,
              contentNotAligned:
                !contentBounds ||
                !pageBounds ||
                Math.abs(contentBounds.left - pageBounds.left) > 1 ||
                Math.abs(contentBounds.right - pageBounds.right) > 1,
            };
          });

        await expect
          .poll(layout, `Layout fora do viewport em ${route} (${width}px).`)
          .toEqual({
            horizontalOverflow: false,
            mainOverflow: false,
            headingOutsideViewport: false,
            contentNotAligned: false,
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

  test("should_show_production_chart_legend_or_empty_state", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();

    const legendLabels = page.locator(
      ".recharts-legend-item-text > span.text-foreground",
    );
    const emptyState = page.getByText(
      "Sem lançamentos de Produção até a competência selecionada.",
    );
    await expect(legendLabels.first().or(emptyState)).toBeVisible();
    if (await emptyState.isVisible()) {
      return;
    }
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
      await page.getByLabel("Início").click();
      await page.getByRole("button", { name: "Este mês" }).click();
      await page.getByLabel("Fim").click();
      await page.getByRole("button", { name: "Este mês" }).click();
      const report = page.getByRole("combobox", { name: "Relatório" });
      await report.click();
      const reportLabels: Record<string, string> = {
        gastos: "Despesas financeiras",
        compras: "Compras e fornecedores",
        internacoes: "Internações agregadas",
        metas: "Metas de Internações",
        producao: "Produção por procedimento",
        cirurgias: "Resumo de Pequenas Cirurgias",
      };
      const reportOption = page.getByRole("option", {
        name: reportLabels[reportType],
      });
      await reportOption.click();
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Baixar CSV" }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      if (!downloadPath) throw new Error("O arquivo CSV não foi salvo.");
      const csv = await readFile(downloadPath, "utf8");

      const competence = new Date()
        .toLocaleDateString("sv-SE", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
        })
        .slice(0, 7);
      expect(download.suggestedFilename()).toBe(
        `${reportType}-${competence}-${competence}.csv`,
      );
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("\r\n");
      expect(csv).not.toContain("HOMOLOGACAO TESTE - RACE");
      expect(csv).not.toContain("HOMOLOGACAO TESTE - DUPLICIDADE");

      if (reportType === "gastos" || reportType === "compras") {
        expect(csv).not.toContain("9999999999,99");
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
