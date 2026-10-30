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
});
