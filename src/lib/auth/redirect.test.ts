import { describe, expect, it } from "vitest";
import { getSafeRedirectPath, isPublicPath, loginPath } from "./redirect";

describe("auth redirects", () => {
  it("keeps login routes public", () => {
    expect(isPublicPath(loginPath)).toBe(true);
    expect(isPublicPath("/login/help")).toBe(true);
    expect(isPublicPath("/financeiro")).toBe(false);
  });

  it("accepts only local redirect paths", () => {
    expect(getSafeRedirectPath("/financeiro")).toBe("/financeiro");
    expect(getSafeRedirectPath("https://example.com")).toBe("/");
    expect(getSafeRedirectPath("//example.com")).toBe("/");
    expect(getSafeRedirectPath(undefined)).toBe("/");
  });
});
