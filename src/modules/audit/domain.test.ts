import { describe, expect, it } from "vitest";
import {
  buildAuditPageHref,
  buildAuditSnapshotFilter,
  buildCsv,
  moduleForEntity,
  parseAuditDate,
} from "./domain";

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

  it("should_preserve_filters_and_snapshot_in_audit_navigation_links", () => {
    const href = buildAuditPageHref(
      { module: "internacoes", actor: "admin id", page: "1" },
      2,
      { createdAt: "2026-10-09T10:00:00.123Z", id: "42" },
    );

    expect(href).toBe(
      "/auditoria?module=internacoes&actor=admin+id&page=2&snapshot_at=2026-10-09T10%3A00%3A00.123Z&snapshot_id=42",
    );
    expect(
      buildAuditPageHref(
        {
          module: "internacoes",
          actor: "admin id",
          page: "2",
          snapshot_at: "2026-10-09T10:00:00.123Z",
          snapshot_id: "42",
        },
        1,
        { createdAt: "2026-10-09T10:00:00.123Z", id: "42" },
      ),
    ).toContain("page=1");
  });

  it("should_build_a_lexicographic_audit_snapshot_filter", () => {
    expect(
      buildAuditSnapshotFilter({
        createdAt: "2026-10-09T10:00:00.123Z",
        id: "42",
      }),
    ).toBe(
      "created_at.lt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.lte.42)",
    );
  });
});
