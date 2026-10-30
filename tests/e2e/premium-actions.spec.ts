import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;

test.describe("ações administrativas compartilhadas", () => {
  test.skip(
    !storageState || !existsSync(storageState),
    "Sessão administrativa legítima necessária.",
  );
  test.use({ storageState: storageState ?? undefined });

  test("should_distinguish_edit_status_and_logout_actions_when_authenticated", async ({
    page,
  }) => {
    await page.goto("/financeiro/farmacia/fornecedores");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Fornecedores",
    );
    const edit = page.locator("summary").filter({ hasText: "Editar" }).first();
    const caution = page.getByRole("button", { name: "Inativar" }).first();
    await expect(edit).toHaveClass(/border-input/);
    await expect(edit.locator("svg")).toHaveCount(1);
    await expect(caution).toHaveClass(/status-warning/);
    await expect(caution.locator("svg")).toHaveCount(1);
    await edit.focus();
    await page.keyboard.press("Enter");
    await expect(edit.locator("xpath=ancestor::details")).toHaveAttribute(
      "open",
      "",
    );

    await page
      .locator('summary[aria-label="Menu da conta: administrador"]')
      .click();
    const logout = page.getByRole("button", { name: "Sair" });
    await expect(logout).toHaveClass(/hover:bg-muted/);
    await expect(logout).not.toHaveClass(/bg-destructive\/10/);
    await expect(logout.locator("svg")).toHaveCount(1);
  });
});
