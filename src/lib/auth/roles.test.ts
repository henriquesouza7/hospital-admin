import { describe, expect, it } from "vitest";
import { hasAdminRole } from "./roles";

describe("hasAdminRole", () => {
  it("should_allow_access_when_role_is_admin", () => {
    expect(hasAdminRole({ role: "admin" })).toBe(true);
    expect(hasAdminRole({ role: "user,admin" })).toBe(true);
  });

  it("should_deny_access_when_role_is_not_admin", () => {
    expect(hasAdminRole({ role: "user" })).toBe(false);
    expect(hasAdminRole({ role: "superadmin" })).toBe(false);
    expect(hasAdminRole({ role: ["admin"] })).toBe(false);
    expect(hasAdminRole(null)).toBe(false);
  });
});
