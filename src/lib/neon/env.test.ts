import { describe, expect, it } from "vitest";
import { getNeonServerEnv } from "./env";

const validEnvironment = {
  NEON_AUTH_BASE_URL: "https://auth.example.neon.tech/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "a-secret-with-at-least-thirty-two-characters",
  NEON_DATA_API_URL: "https://data.example.neon.tech",
};

describe("Neon environment", () => {
  it("parses server configuration from an injected environment", () => {
    expect(getNeonServerEnv(validEnvironment)).toEqual({
      authBaseUrl: validEnvironment.NEON_AUTH_BASE_URL,
      authCookieSecret: validEnvironment.NEON_AUTH_COOKIE_SECRET,
      dataApiUrl: validEnvironment.NEON_DATA_API_URL,
    });
  });

  it("rejects incomplete configuration", () => {
    expect(() => getNeonServerEnv({})).toThrow("Neon server não configurado");
  });
});
