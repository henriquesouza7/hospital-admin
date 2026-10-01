import { describe, expect, it } from "vitest";
import { navigationItems } from "./navigation";

describe("navigationItems", () => {
  it("contains every route required by the application shell", () => {
    expect(navigationItems.map(({ href }) => href)).toEqual([
      "/",
      "/financeiro",
      "/financeiro/farmacia",
      "/financeiro/laboratorio",
      "/financeiro/feira",
      "/internacoes",
      "/producao",
      "/pequenas-cirurgias",
      "/configuracoes",
    ]);
  });
});
