import { expect, test } from "@playwright/test";

test("protects production administration routes without a session", async ({
  page,
}) => {
  for (const route of [
    "/producao",
    "/producao/procedimentos",
    "/producao/lancamentos",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
    ).toBeVisible();
  }
});
