import { describe, expect, it } from "vitest";
import { isAuthorizedIsolatedE2eEnvironment } from "./isolated-e2e-environment";

const isolatedEnvironment = {
  appOrigin: "http://localhost:3006",
  authBaseUrl:
    "https://ep-noisy-breeze-b7j6fzqn.neonauth.c-13.us-east-1.aws.neon.tech/neondb/auth",
  dataApiUrl:
    "https://ep-noisy-breeze-b7j6fzqn.apirest.c-13.us-east-1.aws.neon.tech/neondb/rest/v1",
  label: "isolated_homologation",
};

describe("isolated E2E environment guard", () => {
  it("allows only the verified isolated app and matching Neon endpoints", () => {
    expect(isAuthorizedIsolatedE2eEnvironment(isolatedEnvironment)).toBe(true);
  });

  it.each([
    { ...isolatedEnvironment, appOrigin: "http://localhost:3003" },
    { ...isolatedEnvironment, label: "shared_demo" },
    {
      ...isolatedEnvironment,
      authBaseUrl:
        "https://ep-small-river-b82tcab9.neonauth.c-14.us-east-1.aws.neon.tech/neondb/auth",
    },
    {
      ...isolatedEnvironment,
      authBaseUrl:
        "https://ep-shared-demo.neonauth.c-14.us-east-1.aws.neon.tech/neondb/auth",
    },
    {
      ...isolatedEnvironment,
      dataApiUrl:
        "https://ep-production.apirest.c-14.us-east-1.aws.neon.tech/neondb/rest/v1",
    },
    {
      ...isolatedEnvironment,
      dataApiUrl:
        "https://ep-noisy-breeze-b7j6fzqn.apirest.c-13.us-east-1.aws.neon.tech/other/rest/v1",
    },
    {
      ...isolatedEnvironment,
      dataApiUrl:
        "https://ep-noisy-breeze-b7j6fzqn.apirest.c-13.us-east-1.aws.neon.tech:8443/neondb/rest/v1",
    },
    { ...isolatedEnvironment, authBaseUrl: "not-a-url" },
  ])("rejects a mismatched or invalid runtime configuration", (environment) => {
    expect(isAuthorizedIsolatedE2eEnvironment(environment)).toBe(false);
  });
});
