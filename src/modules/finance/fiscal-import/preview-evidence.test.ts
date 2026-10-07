import { describe, expect, it } from "vitest";
import {
  FISCAL_PREVIEW_TTL_SECONDS,
  issueFiscalPreviewEvidence,
  verifyFiscalPreviewEvidence,
} from "./preview-evidence";

const hash = "a".repeat(64);
const subject = "admin-user-id";
const secret = "test-only-cookie-secret-with-at-least-32-characters";
const issuedAt = Date.UTC(2026, 9, 7, 12, 0, 0);

describe("fiscal preview evidence", () => {
  it("should_accept_confirmation_after_a_server_preview", () => {
    const evidence = issueFiscalPreviewEvidence(
      hash,
      subject,
      secret,
      issuedAt,
    );

    expect(
      verifyFiscalPreviewEvidence(evidence, hash, subject, secret, issuedAt),
    ).toBe(true);
  });

  it("should_reject_confirmation_without_a_preview_evidence", () => {
    expect(
      verifyFiscalPreviewEvidence("", hash, subject, secret, issuedAt),
    ).toBe(false);
  });

  it("should_reject_tampered_or_wrong_user_evidence", () => {
    const evidence = issueFiscalPreviewEvidence(
      hash,
      subject,
      secret,
      issuedAt,
    );
    const tampered = `${evidence.slice(0, -1)}${evidence.endsWith("A") ? "B" : "A"}`;

    expect(
      verifyFiscalPreviewEvidence(tampered, hash, subject, secret, issuedAt),
    ).toBe(false);
    expect(
      verifyFiscalPreviewEvidence(
        evidence,
        hash,
        "another-user",
        secret,
        issuedAt,
      ),
    ).toBe(false);
  });

  it("should_reject_xml_changed_after_preview", () => {
    const evidence = issueFiscalPreviewEvidence(
      hash,
      subject,
      secret,
      issuedAt,
    );

    expect(
      verifyFiscalPreviewEvidence(
        evidence,
        "b".repeat(64),
        subject,
        secret,
        issuedAt,
      ),
    ).toBe(false);
  });

  it("should_expire_evidence_after_five_minutes", () => {
    const evidence = issueFiscalPreviewEvidence(
      hash,
      subject,
      secret,
      issuedAt,
    );
    const expiredAt = issuedAt + (FISCAL_PREVIEW_TTL_SECONDS + 1) * 1000;

    expect(
      verifyFiscalPreviewEvidence(evidence, hash, subject, secret, expiredAt),
    ).toBe(false);
  });
});
