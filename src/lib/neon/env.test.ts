import { describe, expect, it } from "vitest";
import { getNeonPublicEnv, getNeonServerEnv } from "./env";

const validEnvironment = {
  NEXT_PUBLIC_NEON_AUTH_URL: "https://auth.example.neon.tech/neondb/auth",
  NEXT_PUBLIC_NEON_DATA_API_URL: "https://data.example.neon.tech",
  NEON_AUTH_BASE_URL: "https://auth.example.neon.tech/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "a-secret-with-at-least-thirty-two-characters",
};

describe("Neon environment", () => {
  it("parses public configuration from an injected environment", () => {
    expect(getNeonPublicEnv(validEnvironment)).toEqual({
      authUrl: validEnvironment.NEXT_PUBLIC_NEON_AUTH_URL,
      dataApiUrl: validEnvironment.NEXT_PUBLIC_NEON_DATA_API_URL,
    });
  });

  it("parses server configuration without reading process.env", () => {
    expect(getNeonServerEnv(validEnvironment)).toEqual({
      authUrl: validEnvironment.NEXT_PUBLIC_NEON_AUTH_URL,
      dataApiUrl: validEnvironment.NEXT_PUBLIC_NEON_DATA_API_URL,
      authBaseUrl: validEnvironment.NEON_AUTH_BASE_URL,
      authCookieSecret: validEnvironment.NEON_AUTH_COOKIE_SECRET,
    });
  });

  it("rejects incomplete configuration", () => {
    expect(() => getNeonPublicEnv({})).toThrow("Neon não configurado");
    expect(() => getNeonServerEnv({})).toThrow("Neon server não configurado");
  });
});
