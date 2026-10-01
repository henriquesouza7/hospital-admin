import { describe, expect, it } from "vitest";
import { isNavigationItemActive, navigationGroups } from "./navigation";

describe("navigation", () => {
  it("keeps finance subitems grouped under Financeiro", () => {
    const finance = navigationGroups.find(({ href }) => href === "/financeiro");

    expect(finance?.items?.map(({ href }) => href)).toEqual([
      "/financeiro/farmacia",
      "/financeiro/laboratorio",
      "/financeiro/feira",
    ]);
  });

  it("matches the exact root route without activating it elsewhere", () => {
    expect(isNavigationItemActive("/", "/")).toBe(true);
    expect(isNavigationItemActive("/financeiro", "/")).toBe(false);
  });

  it("keeps a parent active for its nested routes", () => {
    expect(isNavigationItemActive("/financeiro/farmacia", "/financeiro")).toBe(
      true,
    );
    expect(
      isNavigationItemActive("/financeiro/farmacia", "/financeiro/farmacia"),
    ).toBe(true);
    expect(isNavigationItemActive("/producao", "/financeiro")).toBe(false);
  });
});
