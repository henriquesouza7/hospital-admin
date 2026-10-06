import { describe, expect, it } from "vitest";
import { parseIndicatorsFilters } from "./validation";

const now = new Date("2026-10-06T12:00:00-03:00");

describe("indicator filter validation", () => {
  it("should_default_to_last_twelve_months_including_current_month_when_filters_are_missing", () => {
    expect(parseIndicatorsFilters({}, now)).toEqual({
      success: true,
      data: { inicio: "2025-11", fim: "2026-10", setor: "todos", produto: "" },
    });
  });

  it("should_reject_partial_period_when_only_one_boundary_is_present", () => {
    expect(parseIndicatorsFilters({ inicio: "2026-01" }, now)).toMatchObject({
      success: false,
      message: "Informe início e fim do período.",
    });
  });

  it("should_reject_invalid_month_values", () => {
    expect(
      parseIndicatorsFilters({ inicio: "2026-13", fim: "2026-12" }, now)
        .success,
    ).toBe(false);
  });

  it("should_reject_when_start_is_after_end", () => {
    expect(
      parseIndicatorsFilters({ inicio: "2026-09", fim: "2026-08" }, now)
        .success,
    ).toBe(false);
  });

  it("should_keep_a_sector_filter_when_the_period_defaults", () => {
    expect(parseIndicatorsFilters({ setor: "laboratorio" }, now)).toMatchObject(
      {
        success: true,
        data: { inicio: "2025-11", fim: "2026-10", setor: "laboratorio" },
      },
    );
  });

  it("should_reject_periods_longer_than_twenty_four_months", () => {
    expect(
      parseIndicatorsFilters({ inicio: "2024-10", fim: "2026-10" }, now),
    ).toMatchObject({
      success: false,
      message: "O período pode conter no máximo 24 meses.",
    });
  });

  it("should_accept_a_valid_twenty_four_month_period_and_purchase_filters", () => {
    expect(
      parseIndicatorsFilters(
        { inicio: "2024-11", fim: "2026-10", setor: "farmacia" },
        now,
      ),
    ).toMatchObject({
      success: true,
      data: { inicio: "2024-11", fim: "2026-10", setor: "farmacia" },
    });
  });

  it("should_reject_repeated_query_parameter_values", () => {
    expect(
      parseIndicatorsFilters(
        { inicio: ["2026-01", "2026-02"], fim: "2026-02" },
        now,
      ).success,
    ).toBe(false);
  });
});
