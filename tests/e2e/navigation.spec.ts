import { expect, test } from "@playwright/test";

test("redirects protected routes to login when Neon is not configured", async ({
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
