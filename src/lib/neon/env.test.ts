import { describe, expect, it } from "vitest";
import { getNeonServerEnv } from "./env";

const validEnvironment = {
  NEON_AUTH_BASE_URL:
    "https://ep-project-branch.neonauth.c-1.aws.neon.tech/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "a-secret-with-at-least-thirty-two-characters",
  NEON_DATA_API_URL:
    "https://ep-project-branch.apirest.c-1.aws.neon.tech/neondb/rest/v1",
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

  it("should_reject_auth_and_data_api_from_different_neon_endpoints", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_DATA_API_URL:
          "https://ep-other-branch.apirest.c-1.aws.neon.tech/neondb/rest/v1",
      }),
    ).toThrow("mesmo endpoint Neon");
  });

  it("should_reject_auth_and_data_api_from_different_databases", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_DATA_API_URL:
          "https://ep-project-branch.apirest.c-1.aws.neon.tech/otherdb/rest/v1",
      }),
    ).toThrow("mesmo endpoint Neon");
  });

  it("should_reject_auth_and_data_api_from_different_regions", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_DATA_API_URL:
          "https://ep-project-branch.apirest.c-2.aws.neon.tech/neondb/rest/v1",
      }),
    ).toThrow("mesmo endpoint Neon");
  });

  it("should_reject_auth_and_data_api_on_different_ports", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_DATA_API_URL:
          "https://ep-project-branch.apirest.c-1.aws.neon.tech:8443/neondb/rest/v1",
      }),
    ).toThrow("mesmo endpoint Neon");
  });

  it("should_reject_unexpected_neon_endpoint_paths", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_DATA_API_URL:
          "https://ep-project-branch.apirest.c-1.aws.neon.tech/neondb/other",
      }),
    ).toThrow("mesmo endpoint Neon");
  });

  it("should_reject_non_https_neon_endpoints", () => {
    expect(() =>
      getNeonServerEnv({
        ...validEnvironment,
        NEON_AUTH_BASE_URL:
          "http://ep-project-branch.neonauth.c-1.aws.neon.tech/neondb/auth",
      }),
    ).toThrow("mesmo endpoint Neon");
  });
});
