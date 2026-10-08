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
    "/internacoes/medicos",
    "/internacoes/medicos/00000000-0000-4000-8000-000000000001",
    "/internacoes/lancamentos",
    "/internacoes/metas",
    "/auditoria",
    "/exportacoes",
    "/api/exportacoes?tipo=gastos&inicio=2026-10&fim=2026-10",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("redirects minor surgeries routes without a session", async ({ page }) => {
  for (const route of [
    "/pequenas-cirurgias",
    "/pequenas-cirurgias/dias",
    "/pequenas-cirurgias/fila",
    "/pequenas-cirurgias/dias/00000000-0000-4000-8000-000000000001",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
});
