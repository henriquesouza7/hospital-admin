import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

type Credentials = Readonly<{ email: string; password: string }>;

const authDirectory = resolve("tests/e2e/.auth");
const adminCredentialsPath = resolve(
  authDirectory,
  "homologacao-admin.credentials.json",
);
const basicStorageStatePath = resolve(authDirectory, "homolog-basic.json");
const hasAdminCredentials = existsSync(adminCredentialsPath);
const hasBasicStorageState = existsSync(basicStorageStatePath);
const expectedEnvironmentLabel =
  process.env.PLAYWRIGHT_EXPECTED_ENVIRONMENT_LABEL;

function readAdminCredentials(): Credentials {
  const value: unknown = JSON.parse(readFileSync(adminCredentialsPath, "utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Credentials).email !== "string" ||
    typeof (value as Credentials).password !== "string"
  ) {
    throw new Error("Credenciais sintéticas locais inválidas.");
  }

  return value as Credentials;
}

test.describe("autenticação com Neon Auth isolado", () => {
  test.describe.configure({ mode: "serial" });

  test("should_login_admin_restore_session_and_logout", async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Credenciais sintéticas locais não estão disponíveis.",
    );
    test.setTimeout(90_000);

    const credentials = readAdminCredentials();
    await page.goto("/login");
    if (expectedEnvironmentLabel) {
      await expect(page.getByText(expectedEnvironmentLabel)).toBeVisible();
    }
    await page.getByLabel("Email").fill("login-test@invalid.example");
    await page
      .getByLabel("Senha", { exact: true })
      .fill("synthetic-invalid-password");
    const invalidLoginResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/sign-in/email" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Entrar" }).click();
    const invalidLogin = await invalidLoginResponse;
    expect(invalidLogin.status()).toBe(401);
    const invalidPayload: unknown = await invalidLogin.json();
    const invalidCode =
      typeof invalidPayload === "object" &&
      invalidPayload !== null &&
      "code" in invalidPayload &&
      typeof invalidPayload.code === "string"
        ? invalidPayload.code
        : null;
    expect(invalidCode).toBe("INVALID_EMAIL_OR_PASSWORD");
    await expect(page.getByText("Email ou senha inválidos.")).toBeVisible();

    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Visão Geral" }),
    ).toBeVisible();
    const session = (await page.evaluate(async () => {
      const response = await fetch("/api/auth/get-session");
      return response.json();
    })) as {
      user?: { role?: string };
    };
    expect(session.user?.role).toBe("admin");

    for (const [path, heading] of [
      ["/financeiro/indicadores", /Indicadores e comparativos/i],
      ["/internacoes", /Dashboard/i],
      ["/pequenas-cirurgias", /Pequenas cirurgias/i],
    ] as const) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("main h1")).toContainText(heading);
    }

    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Pequenas cirurgias" }),
    ).toBeVisible();

    await page
      .locator('summary[aria-label="Menu da conta: administrador"]')
      .click();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Visão Geral" }),
    ).toBeVisible();
    const tokenResponse = await page.request.get("/api/auth/token");
    expect(tokenResponse.ok()).toBe(true);
    await page.context().storageState({
      path: resolve(authDirectory, "homologacao-admin.json"),
    });
  });

  test("should_deny_finance_route_to_a_real_non_admin_session", async ({
    browser,
  }) => {
    test.skip(
      !hasBasicStorageState,
      "Storage state sintético básico não está disponível.",
    );
    const context = await browser.newContext({
      storageState: basicStorageStatePath,
    });

    try {
      const page = await context.newPage();
      await page.goto("/financeiro/indicadores");
      await expect(page).toHaveURL(/\/login\?error=forbidden$/);
      await expect(
        page.getByRole("alert").filter({
          hasText: "Sua conta não tem acesso administrativo.",
        }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
