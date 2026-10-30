import { describe, expect, it } from "vitest";
import {
  buildAuditPageHref,
  buildAuditCursorFilter,
  buildAuditReverseCursorFilter,
  buildCsv,
  describeAuditEvent,
  moduleForEntity,
  parseAuditDate,
} from "./domain";

describe("audit and CSV domain", () => {
  it("should_describe_created_record_when_safe_subject_is_recorded", () => {
    expect(
      describeAuditEvent("procedure_category", "created", {
        after: { name: "Categoria sintética" },
      }),
    ).toEqual({
      subject: "Categoria de procedimento",
      actionLabel: "Criado",
      context: "Categoria sintética",
      tone: "positive",
    });
  });

  it("should_hide_patient_name_when_describing_surgery_audit", () => {
    expect(
      describeAuditEvent("surgery_patient", "created", {
        name: "Pessoa fictícia",
      }).context,
    ).toBe("");
  });

  it("should_format_recorded_surgery_date_for_brazilian_readers", () => {
    expect(
      describeAuditEvent("surgery_day", "created", {
        procedure_date: "2027-01-15",
      }).context,
    ).toBe("15/01/2027");
  });

  it("should_preserve_unknown_actions_in_technical_details_only", () => {
    expect(describeAuditEvent("unknown", "unmapped", {})).toEqual({
      subject: "Registro administrativo",
      actionLabel: "Alteração registrada",
      context: "",
      tone: "neutral",
    });
  });

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

  it("should_preserve_filters_and_use_one_cursor_in_audit_navigation_links", () => {
    const cursor = { createdAt: "2026-10-09T10:00:00.123Z", id: "42" };
    const href = buildAuditPageHref(
      { module: "internacoes", actor: "admin id", page: "1" },
      2,
      cursor,
    );

    expect(href).toBe(
      "/auditoria?module=internacoes&actor=admin+id&page=2&cursor_at=2026-10-09T10%3A00%3A00.123Z&cursor_id=42",
    );
    const thirdPageHref = buildAuditPageHref(
      { module: "internacoes", page: "2", cursor_at: cursor.createdAt },
      3,
      { createdAt: "2026-10-09T09:00:00.000Z", id: "20" },
    );
    expect(thirdPageHref).toContain("page=3");
    expect(thirdPageHref).not.toContain("cursor_history=");

    const previousPageHref = buildAuditPageHref(
      {
        module: "internacoes",
        page: "3",
        cursor_at: "2026-10-09T09:00:00.000Z",
        cursor_direction: "before",
      },
      2,
      cursor,
      "before",
    );
    expect(previousPageHref).toContain("page=2");
    expect(previousPageHref).toContain("cursor_direction=before");
    expect(previousPageHref).not.toContain("cursor_history=");

    const firstPageHref = buildAuditPageHref(
      { module: "internacoes", page: "2", cursor_at: cursor.createdAt },
      1,
      cursor,
      "before",
    );
    expect(firstPageHref).toContain("page=1");
    expect(firstPageHref).toContain("cursor_direction=before");

    const page200Href = buildAuditPageHref({ module: "todos" }, 200, cursor);
    expect(page200Href.length).toBeLessThan(250);
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
    expect(
      buildAuditReverseCursorFilter({
        createdAt: "2026-10-09T10:00:00.123Z",
        id: "42",
      }),
    ).toBe(
      "created_at.gt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.gt.42)",
    );
  });
});
