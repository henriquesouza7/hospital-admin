import { describe, expect, it } from "vitest";
import {
  getLoginErrorMessage,
  getLoginUnavailableMessage,
} from "./login-error";

describe("login error messages", () => {
  it("should_show_generic_credentials_message_for_documented_credential_rejection", () => {
    expect(
      getLoginErrorMessage(401, { code: "INVALID_EMAIL_OR_PASSWORD" }),
    ).toBe("Email ou senha inválidos.");
  });

  it("should_not_treat_unclassified_bad_request_as_invalid_credentials", () => {
    expect(getLoginErrorMessage(400, { code: "UNKNOWN" })).toContain(
      "Não foi possível processar",
    );
    expect(getLoginErrorMessage(400, { message: "Bad request" })).not.toBe(
      "Email ou senha inválidos.",
    );
  });

  it("should_report_documented_invalid_email_and_configuration_errors", () => {
    expect(getLoginErrorMessage(400, { code: "INVALID_EMAIL" })).toContain(
      "email válido",
    );
    expect(
      getLoginErrorMessage(400, { code: "EMAIL_PASSWORD_DISABLED" }),
    ).toContain("Procure o administrador");
  });

  it("should_keep_unknown_unauthorized_and_forbidden_errors_generic", () => {
    expect(getLoginErrorMessage(401, { code: "UNKNOWN" })).not.toBe(
      "Email ou senha inválidos.",
    );
    expect(getLoginErrorMessage(403, { code: "UNKNOWN" })).toContain(
      "Não foi possível processar",
    );
  });

  it("should_keep_unverified_accounts_non_enumerable", () => {
    expect(getLoginErrorMessage(403, { code: "EMAIL_NOT_VERIFIED" })).toBe(
      "Não foi possível autenticar a conta. Procure o administrador.",
    );
  });

  it("should_ask_rate_limited_users_to_wait", () => {
    expect(getLoginErrorMessage(429, {})).toContain("Aguarde");
  });

  it.each([500, 502, 503])(
    "should_report_http_%i_as_service_unavailable",
    (status) => {
      expect(getLoginErrorMessage(status, {})).toContain(
        "indisponível no momento",
      );
    },
  );

  it("should_report_transport_failure_without_provider_details", () => {
    expect(getLoginUnavailableMessage()).toContain("indisponível no momento");
  });

  it("should_never_expose_provider_messages_or_nested_personal_data", () => {
    const personalData = "private@example.invalid";
    const result = getLoginErrorMessage(500, {
      message: personalData,
      email: personalData,
      error: { code: "INTERNAL", token: "secret" },
    });

    expect(result).not.toContain(personalData);
    expect(result).not.toContain("secret");
  });
});
