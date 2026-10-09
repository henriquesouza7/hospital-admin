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
    expect(
      getPasswordResetRedirectUrl("http://localhost:3000", "development"),
    ).toBe("http://localhost:3000/login/reset-password");
    expect(
      getPasswordResetRedirectUrl("http://localhost:3002", "development"),
    ).toBe("http://localhost:3002/login/reset-password");
  });

  it("should_require_a_configured_origin_outside_development", () => {
    expect(() =>
      getPasswordResetRedirectUrl(undefined, "production"),
    ).toThrow();
  });

  it("should_reject_external_http_origins_and_local_http_in_production", () => {
    expect(() =>
      getPasswordResetRedirectUrl("http://example.com", "production"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("http://example.com", "development"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("http://localhost", "development"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("http://localhost:3002", "production"),
    ).toThrow();
  });

  it("should_reject_invalid_urls_and_non_origin_values", () => {
    expect(() =>
      getPasswordResetRedirectUrl("not a url", "development"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("http://localhost:3002/reset", "development"),
    ).toThrow();
    expect(() =>
      getPasswordResetRedirectUrl("https://example.com/other", "production"),
    ).toThrow();
    expect(
      getPasswordResetRedirectUrl("https://hospital.example", "production"),
    ).toBe("https://hospital.example/login/reset-password");
  });
});
