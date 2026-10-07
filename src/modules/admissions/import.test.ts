import { describe, expect, it } from "vitest";
import {
  issueAdmissionCsvEvidence,
  parseAdmissionCsv,
  verifyAdmissionCsvEvidence,
} from "./import";

const doctors = [
  { id: "doctor-a", name: "Dra. Teste A", active: true },
  { id: "doctor-b", name: "Dr. Teste B", active: false },
];
const validCsv = "data,medico,quantidade\n2026-10-01,Dra. Teste A,4\n";

describe("admissions CSV import", () => {
  it("should_parse_exact_active_doctor_rows_when_csv_is_valid", () => {
    expect(parseAdmissionCsv(validCsv, doctors)).toEqual([
      {
        line: 2,
        entry_date: "2026-10-01",
        doctor_name: "Dra. Teste A",
        quantity: 4,
        doctor_id: "doctor-a",
        error: null,
      },
    ]);
  });

  it("should_reject_unknown_doctor_when_name_does_not_match_exactly", () => {
    expect(
      parseAdmissionCsv(
        "data,medico,quantidade\n2026-10-01,Dra Teste A,4\n",
        doctors,
      )[0]?.error,
    ).toContain("não encontrado");
  });

  it("should_reject_inactive_doctor_for_new_imported_entry", () => {
    expect(
      parseAdmissionCsv(
        "data,medico,quantidade\n2026-10-01,Dr. Teste B,4\n",
        doctors,
      )[0]?.error,
    ).toContain("inativo");
  });

  it("should_reject_duplicate_daily_doctor_rows_inside_file", () => {
    const rows = parseAdmissionCsv(
      `${validCsv}2026-10-01,Dra. Teste A,2\n`,
      doctors,
    );
    expect(rows[1]?.error).toContain("duplicado");
  });

  it("should_reject_invalid_quantity_and_date_by_row", () => {
    const rows = parseAdmissionCsv(
      "data,medico,quantidade\n2026-02-30,Dra. Teste A,4\n2026-10-01,Dra. Teste A,-1\n",
      doctors,
    );
    expect(rows.map((row) => row.error)).toEqual([
      "Data inválida; use AAAA-MM-DD.",
      "Quantidade deve ser um inteiro não negativo.",
    ]);
  });

  it("should_reject_ambiguous_exact_doctor_name", () => {
    const ambiguousDoctors = [
      ...doctors,
      { id: "doctor-c", name: "Dra. Teste A", active: true },
    ];
    expect(parseAdmissionCsv(validCsv, ambiguousDoctors)[0]?.error).toContain(
      "ambíguo",
    );
  });

  it("should_reject_unclosed_csv_quotes", () => {
    expect(() =>
      parseAdmissionCsv(
        'data,medico,quantidade\n2026-10-01,"Dra. Teste A,4\n',
        doctors,
      ),
    ).toThrow("aspas de fechamento");
  });

  it("should_verify_signed_preview_for_same_file_and_actor_only", () => {
    const token = issueAdmissionCsvEvidence(
      "a".repeat(64),
      "admin-1",
      "test-only-secret-with-at-least-thirty-two-characters",
    );
    expect(
      verifyAdmissionCsvEvidence(
        token,
        "a".repeat(64),
        "admin-1",
        "test-only-secret-with-at-least-thirty-two-characters",
      ),
    ).toBe(true);
    expect(
      verifyAdmissionCsvEvidence(
        token,
        "b".repeat(64),
        "admin-1",
        "test-only-secret-with-at-least-thirty-two-characters",
      ),
    ).toBe(false);
    expect(
      verifyAdmissionCsvEvidence(
        token,
        "a".repeat(64),
        "admin-2",
        "test-only-secret-with-at-least-thirty-two-characters",
      ),
    ).toBe(false);
  });

  it("should_reject_expired_preview_evidence", () => {
    const token = issueAdmissionCsvEvidence(
      "a".repeat(64),
      "admin-1",
      "test-only-secret-with-at-least-thirty-two-characters",
      1_000_000,
    );
    expect(
      verifyAdmissionCsvEvidence(
        token,
        "a".repeat(64),
        "admin-1",
        "test-only-secret-with-at-least-thirty-two-characters",
        1_301_000,
      ),
    ).toBe(false);
  });
});
