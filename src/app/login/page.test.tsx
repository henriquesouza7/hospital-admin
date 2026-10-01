import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders the administrative email and password access", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Acesso administrativo");
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).not.toContain("Criar conta");
  });
});
