import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", title: "Visão geral" },
  { path: "/financeiro", title: "Financeiro" },
  { path: "/financeiro/farmacia", title: "Farmácia" },
  { path: "/financeiro/laboratorio", title: "Laboratório" },
  { path: "/financeiro/feira", title: "Feira" },
  { path: "/internacoes", title: "Internações" },
  { path: "/producao", title: "Produção hospitalar" },
  { path: "/pequenas-cirurgias", title: "Pequenas cirurgias" },
  { path: "/configuracoes", title: "Configurações" },
] as const;

for (const page of pages) {
  test(`${page.path} renders its placeholder`, async ({
    page: browserPage,
  }) => {
    await browserPage.goto(page.path);

    await expect(
      browserPage.getByRole("heading", { level: 1, name: page.title }),
    ).toBeVisible();
    await expect(
      browserPage.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeVisible();
  });
}
