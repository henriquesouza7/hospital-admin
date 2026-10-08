import { describe, expect, it } from "vitest";
import { buildCsv, moduleForEntity, parseAuditDate } from "./domain";

describe("audit and CSV domain", () => {
  it("should_map_known_entities_to_their_module", () => {
    expect(moduleForEntity("doctor")).toBe("internacoes");
    expect(moduleForEntity("surgery_appointment")).toBe("pequenas-cirurgias");
  });

  it("should_reject_invalid_calendar_dates_when_filtering", () => {
    expect(parseAuditDate("2026-02-30")).toBeNull();
    expect(parseAuditDate("2026-10-08", true)).toBe(
      "2026-10-09T00:00:00.000-03:00",
    );
  });

  it("should_escape_csv_delimiters_quotes_and_formula_prefixes", () => {
    expect(
      buildCsv([
        ["Nome", "Fórmula"],
        ["A; B", "=1+1"],
      ]),
    ).toBe('\uFEFF"Nome","Fórmula"\r\n"A; B","\'=1+1"\r\n');
  });
});
