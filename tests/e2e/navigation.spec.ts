import { expect, test } from "@playwright/test";

test("redirects protected routes to login without a session", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
  ).toBeVisible();
});

test("renders the email and password login form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("redirects administrative routes without a session", async ({ page }) => {
  for (const route of [
    "/financeiro/fornecedores?setor=farmacia",
    "/financeiro/fornecedores?setor=laboratorio",
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
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
});
