import { describe, expect, it } from "vitest";
import {
  buildAuditPageHref,
  buildAuditCursorFilter,
  parseAuditCursorHistory,
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

  it("should_preserve_filters_and_cursor_history_in_audit_navigation_links", () => {
    const cursor = { createdAt: "2026-10-09T10:00:00.123Z", id: "42" };
    const href = buildAuditPageHref(
      { module: "internacoes", actor: "admin id", page: "1" },
      2,
      cursor,
      [],
    );

    expect(href).toBe(
      "/auditoria?module=internacoes&actor=admin+id&page=2&cursor_at=2026-10-09T10%3A00%3A00.123Z&cursor_id=42",
    );
    const thirdPageHref = buildAuditPageHref(
      { module: "internacoes", page: "2", cursor_at: cursor.createdAt },
      3,
      { createdAt: "2026-10-09T09:00:00.000Z", id: "20" },
      [cursor],
    );
    expect(thirdPageHref).toContain("page=3");
    expect(thirdPageHref).toContain("cursor_history=");
    expect(thirdPageHref).not.toContain("snapshot_");

    const secondPageHref = buildAuditPageHref(
      {
        module: "internacoes",
        page: "3",
        cursor_at: "2026-10-09T09:00:00.000Z",
        cursor_history: `${cursor.createdAt}|${cursor.id}`,
      },
      2,
      cursor,
      [],
    );
    expect(secondPageHref).toContain("page=2");
    expect(secondPageHref).not.toContain("cursor_history=");

    const firstPageHref = buildAuditPageHref(
      { module: "internacoes", page: "2", cursor_at: cursor.createdAt },
      1,
      null,
      [],
    );
    expect(firstPageHref).toBe("/auditoria?module=internacoes&page=1");
  });

  it("should_build_a_strict_lexicographic_audit_cursor_filter", () => {
    expect(
      buildAuditCursorFilter({
        createdAt: "2026-10-09T10:00:00.123Z",
        id: "42",
      }),
    ).toBe(
      "created_at.lt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.lt.42)",
    );
  });

  it("should_parse_only_complete_cursor_history_for_the_requested_page", () => {
    const cursor = "2026-10-09T10:00:00.123Z|42";
    expect(parseAuditCursorHistory(cursor, 3)).toEqual([
      { createdAt: "2026-10-09T10:00:00.123Z", id: "42" },
    ]);
    expect(parseAuditCursorHistory(cursor, 2)).toBeNull();
    expect(parseAuditCursorHistory(null, 1)).toEqual([]);
  });
});
