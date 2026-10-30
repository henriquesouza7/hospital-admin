import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;

test.describe("seletores administrativos", () => {
  test.skip(
    !storageState || !existsSync(storageState),
    "Requer sessão administrativa real no ambiente isolado.",
  );
  test.use({ storageState: storageState ?? undefined });

  test("should_preserve_year_filter_when_submitting_fair_summary", async ({
    page,
  }) => {
    await page.goto("/financeiro/feira");
    const year = page.getByRole("combobox", { name: "Ano" });
    await year.click();
    await expect(page.getByRole("option", { name: "2026" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(year).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page).toHaveURL(/ano=2026/);
    await expect(year).toContainText("2026");
  });

  test("should_select_and_clear_competence_with_keyboard", async ({ page }) => {
    await page.goto("/producao/indicadores");
    const competence = page.getByRole("button", { name: "Competência" });
    await competence.click();
    await expect(page.getByRole("group", { name: /Meses de/ })).toBeVisible();
    await page.getByRole("button", { name: "Ano anterior" }).click();
    const january = page.getByRole("button", { name: /Jan de 2025/ });
    await january.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: /Fev de 2025/ }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(competence).toContainText("Fev de 2025");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/competencia=2025-02/);
    await expect(competence).toContainText("Fev de 2025");

    await competence.click();
    await page.getByRole("button", { name: "Limpar", exact: true }).click();
    await expect(competence).toContainText("Selecione o mês");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/competencia=/);
  });

  test("should_submit_module_filter_and_keep_accessible_options", async ({
    page,
  }) => {
    await page.goto("/auditoria");
    const moduleSelect = page.getByRole("combobox", { name: "Módulo" });
    await moduleSelect.click();
    await expect(
      page.getByRole("option", { name: "Financeiro" }),
    ).toBeVisible();
    await page.getByRole("option", { name: "Financeiro" }).click();
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/module=financeiro/);
    await expect(moduleSelect).toContainText("Financeiro");
  });

  test("should_select_a_day_and_apply_audit_date_filter", async ({ page }) => {
    await page.goto("/auditoria");
    const from = page.getByRole("button", { name: "De", exact: true });
    await from.click();
    await expect(page.getByRole("grid", { name: /2026/ })).toBeVisible();
    const firstDay = page.getByRole("button", {
      name: "1 de outubro de 2026",
      exact: true,
    });
    await firstDay.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: "2 de outubro de 2026", exact: true }),
    ).toBeFocused();
    await firstDay.click();
    await expect(from).toContainText("01/10/2026");
    await from.click();
    await expect(firstDay).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1 de outubro de 2026")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/from=2026-10-01/);
  });

  test("should_keep_daily_date_popover_within_mobile_viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auditoria");
    await page.getByRole("button", { name: "De", exact: true }).click();
    const grid = page.getByRole("grid", { name: /2026/ });
    await expect(grid).toBeVisible();
    const bounds = await grid.locator("..").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewport: innerWidth,
        height: innerHeight,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    expect(
      await page.evaluate(() => document.body.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("should_preserve_required_surgery_day_selection_without_submitting", async ({
    page,
  }) => {
    await page.goto("/pequenas-cirurgias");
    const dateField = page.locator('input[name="procedure_date"]');
    const trigger = dateField.locator("..").getByRole("button").first();
    await trigger.click();
    await expect(page.getByRole("button", { name: "Limpar" })).toBeDisabled();
    const day = page.getByRole("grid").getByRole("button", {
      name: /15 de outubro de 2026/,
    });
    await day.click();
    await expect(dateField).toHaveValue("2026-10-15");
    await expect(trigger).toContainText("15/10/2026");
  });

  for (const width of [390, 1440]) {
    test(`should_keep_open_selectors_inside_${width}px_viewport`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/producao/indicadores");
      await page.getByRole("button", { name: "Competência" }).click();
      const popup = page.getByRole("group", { name: /Meses de/ }).locator("..");
      await expect(popup).toBeVisible();
      const geometry = await popup.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, viewport: innerWidth };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(
        await page.evaluate(() => document.body.scrollWidth),
      ).toBeLessThanOrEqual(width);
    });
  }

  test("should_align_filter_actions_and_keep_them_on_one_row", async ({
    page,
  }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/producao/indicadores");
      const apply = page.getByRole("button", { name: "Aplicar filtros" });
      const clear = page.getByRole("link", { name: "Limpar filtros" });
      await expect(apply).toBeVisible();
      await expect(clear).toBeVisible();
      const applyBox = await apply.boundingBox();
      const clearBox = await clear.boundingBox();
      if (!applyBox || !clearBox) {
        throw new Error("Ações dos filtros não estão visíveis.");
      }
      expect(Math.abs(applyBox.y - clearBox.y)).toBeLessThan(1);
      expect(applyBox.height).toBe(40);
      expect(clearBox.height).toBe(40);
      expect(clearBox.x).toBeGreaterThan(applyBox.x);
      expect(
        await page.evaluate(() => document.body.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });

  test("should_match_form_action_height_to_controls_across_modules", async ({
    page,
  }) => {
    for (const [path, name] of [
      ["/financeiro/feira", "Consultar"],
      ["/financeiro/indicadores", "Aplicar filtros"],
      ["/internacoes", "Aplicar período"],
      ["/internacoes/lancamentos", "Aplicar período"],
      ["/internacoes/lancamentos", "Gerar prévia"],
      ["/internacoes/medicos", "Cadastrar médico"],
      ["/producao/procedimentos", "Filtrar"],
      ["/producao/procedimentos", "Cadastrar"],
      ["/producao/lancamentos", "Filtrar"],
      ["/producao/lancamentos", "Registrar lançamento"],
      ["/auditoria", "Aplicar filtros"],
      ["/exportacoes", "Baixar CSV"],
    ] as const) {
      await page.goto(path);
      const action = page.getByRole("button", { name, exact: true });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box?.height, path).toBe(40);
    }
  });
});
