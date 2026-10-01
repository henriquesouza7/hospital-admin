import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", title: "Visão geral", active: "Visão geral" },
  { path: "/financeiro", title: "Financeiro", active: "Financeiro" },
  {
    path: "/financeiro/farmacia",
    title: "Farmácia",
    active: "Farmácia",
  },
  {
    path: "/financeiro/laboratorio",
    title: "Laboratório",
    active: "Laboratório",
  },
  { path: "/financeiro/feira", title: "Feira", active: "Feira" },
  { path: "/internacoes", title: "Internações", active: "Internações" },
  { path: "/producao", title: "Produção hospitalar", active: "Produção" },
  {
    path: "/pequenas-cirurgias",
    title: "Pequenas cirurgias",
    active: "Pequenas cirurgias",
  },
  {
    path: "/configuracoes",
    title: "Configurações",
    active: "Configurações",
  },
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
    await expect(
      browserPage.getByRole("link", { name: page.active, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}
