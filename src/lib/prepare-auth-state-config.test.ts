import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canReuseStorageState,
  createEnvironmentMetadata,
  resolveAuthStateConfig,
} from "../../tests/e2e/prepare-auth-state-config.mjs";

const projectDirectory = "C:/repo";
const validEnvironment = {
  PLAYWRIGHT_BASE_URL: "http://localhost:3006",
  PLAYWRIGHT_AUTH_STORAGE_STATE: "tests/e2e/.auth/homologacao-admin.json",
};

describe("prepare-auth-state configuration", () => {
  it("should_require_an_explicit_local_base_url", () => {
    expect(() =>
      resolveAuthStateConfig(
        { ...validEnvironment, PLAYWRIGHT_BASE_URL: undefined },
        projectDirectory,
      ),
    ).toThrow(/Defina PLAYWRIGHT_BASE_URL.*localhost.*3006/);
  });

  it.each(["http://localhost:3000", "http://localhost:3002"])(
    "should_accept_localhost_with_explicit_port_%s",
    (url) => {
      expect(
        resolveAuthStateConfig(
          { ...validEnvironment, PLAYWRIGHT_BASE_URL: url },
          projectDirectory,
        ).baseURL.origin,
      ).toBe(url);
    },
  );

  it.each([
    "http://example.com:3006",
    "http://192.168.1.20:3006",
    "https://localhost:3006",
    "http://localhost",
    "not a URL",
    "http://user:password@localhost:3006",
    "http://localhost:3006/login",
  ])("should_reject_unsafe_or_invalid_base_url_%s", (url) => {
    expect(() =>
      resolveAuthStateConfig(
        { ...validEnvironment, PLAYWRIGHT_BASE_URL: url },
        projectDirectory,
      ),
    ).toThrow(/PLAYWRIGHT_BASE_URL/);
  });

  it("should_require_an_environment_specific_ignored_storage_path", () => {
    expect(() =>
      resolveAuthStateConfig(
        { ...validEnvironment, PLAYWRIGHT_AUTH_STORAGE_STATE: undefined },
        projectDirectory,
      ),
    ).toThrow(/PLAYWRIGHT_AUTH_STORAGE_STATE/);

    const config = resolveAuthStateConfig(validEnvironment, projectDirectory);
    expect(config.storageStatePath).toBe(
      resolve(projectDirectory, "tests/e2e/.auth/homologacao-admin.json"),
    );
  });

  it("should_bind_reuse_to_the_origin_and_neon_project_endpoints", () => {
    const expected = createEnvironmentMetadata({
      baseURL: new URL("http://localhost:3006"),
      authBaseURL: "https://auth-project-a.neon.tech",
      dataAPIURL: "https://data-project-a.neon.tech",
    });

    const state = { cookies: [], origins: [] };
    expect(canReuseStorageState(state, expected, expected)).toBe(true);
    expect(
      canReuseStorageState(
        state,
        { ...expected, authEndpoint: "https://auth-project-b.neon.tech" },
        expected,
      ),
    ).toBe(false);
    expect(canReuseStorageState(state, undefined, expected)).toBe(false);
    expect(
      canReuseStorageState({ cookies: "invalid" }, expected, expected),
    ).toBe(false);
    expect(canReuseStorageState(undefined, expected, expected)).toBe(false);
  });

  it("should_not_include_secrets_in_configuration_errors", () => {
    const secretURL =
      "http://admin:do-not-log@example.com:3006/private?token=do-not-log";
    let errorMessage = "";
    try {
      resolveAuthStateConfig(
        { ...validEnvironment, PLAYWRIGHT_BASE_URL: secretURL },
        projectDirectory,
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "";
    }

    expect(errorMessage).toMatch(/PLAYWRIGHT_BASE_URL/);
    expect(errorMessage).not.toContain("do-not-log");
    expect(errorMessage).not.toContain("admin");
  });

  it("should_document_separate_origins_and_session_files_for_each_environment", async () => {
    const guide = await readFile("docs/DEMO_2026-10-09.md", "utf8");
    expect(guide).toContain('PLAYWRIGHT_BASE_URL = "http://localhost:3003"');
    expect(guide).toContain('PLAYWRIGHT_BASE_URL = "http://localhost:3006"');
    expect(guide).toContain("demo-admin.json");
    expect(guide).toContain("homologacao-admin.json");
  });
});
