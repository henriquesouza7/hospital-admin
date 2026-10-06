import { describe, expect, it } from "vitest";
import {
  getPasswordResetRedirectUrl,
  getSafeRedirectPath,
  isPublicPath,
  loginPath,
} from "./redirect";

describe("auth redirects", () => {
  it("keeps login routes public", () => {
    expect(isPublicPath(loginPath)).toBe(true);
    expect(isPublicPath("/login/help")).toBe(true);
    expect(isPublicPath("/financeiro")).toBe(false);
  });

  it("accepts only local redirect paths", () => {
    expect(getSafeRedirectPath("/financeiro")).toBe("/financeiro");
    expect(getSafeRedirectPath("/financeiro?periodo=2026#resumo")).toBe(
      "/financeiro?periodo=2026#resumo",
    );
    expect(getSafeRedirectPath("https://example.com")).toBe("/");
    expect(getSafeRedirectPath("//example.com")).toBe("/");
    expect(getSafeRedirectPath("/\\example.com")).toBe("/");
    expect(getSafeRedirectPath("/financeiro\\example.com")).toBe("/");
    expect(getSafeRedirectPath("financeiro")).toBe("/");
    expect(getSafeRedirectPath(undefined)).toBe("/");
  });

  it("should_use_local_origin_when_resetting_password_in_development", () => {
    expect(getPasswordResetRedirectUrl(undefined, "development")).toBe(
      "http://localhost:3000/login/reset-password",
    );
  });

  it("should_reject_untrusted_origin_when_resetting_password", () => {
    expect(() =>
      getPasswordResetRedirectUrl(undefined, "production"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("http://example.com", "production"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("https://example.com/other", "production"),
    ).toThrow();
    expect(
      getPasswordResetRedirectUrl("https://hospital.example", "production"),
    ).toBe("https://hospital.example/login/reset-password");
  });
});
