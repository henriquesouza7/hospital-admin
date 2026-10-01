import { describe, expect, it } from "vitest";
import {
  getLoginRedirectUrl,
  getSafeRedirectPath,
  isPublicPath,
} from "./redirect";

describe("auth redirects", () => {
  it("keeps only login routes public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/help")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
  });

  it("prevents external redirect targets", () => {
    expect(getSafeRedirectPath("/financeiro")).toBe("/financeiro");
    expect(getSafeRedirectPath("https://example.com")).toBe("/");
    expect(getSafeRedirectPath("//example.com")).toBe("/");
  });

  it("preserves the protected pathname in the login URL", () => {
    expect(
      getLoginRedirectUrl("https://hospital.test", "/financeiro").toString(),
    ).toBe("https://hospital.test/login?next=%2Ffinanceiro");
  });
});
