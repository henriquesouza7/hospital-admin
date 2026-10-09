import { describe, expect, it } from "vitest";
import { getSafeAuthErrorDetails } from "./safe-error-log";

describe("safe auth error logging", () => {
  it("should_keep_only_status_and_safe_code_without_sensitive_fields", () => {
    expect(
      getSafeAuthErrorDetails("request_password_reset", {
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "email user@example.com token secret password hunter2",
        email: "user@example.com",
        token: "secret-token",
        password: "hunter2",
      }),
    ).toEqual({
      operation: "request_password_reset",
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("should_drop_malformed_status_and_codes_that_could_contain_personal_data", () => {
    expect(
      getSafeAuthErrorDetails("reset_password", {
        status: "503",
        code: "user@example.com",
      }),
    ).toEqual({ operation: "reset_password" });
  });
});
