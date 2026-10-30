import { describe, expect, it } from "vitest";
import { buildDashboardProductionMonthlyData } from "./production-monthly";

const entry = (
  month: string,
  quantity: string,
  counting_unit = "procedimentos",
  source = "manual",
) => ({
  counting_unit,
  quantity,
  reference_period: month + "-01",
  source,
});

describe("dashboard monthly production", () => {
  it("should_return_twelve_months_and_leave_unlaunched_periods_empty", () => {
    const result = buildDashboardProductionMonthlyData(
      [entry("2026-10", "7")],
      2026,
      10,
      "2026-10",
    );

    expect(result.months).toHaveLength(12);
    expect(result.months[9]?.values[result.dimensions[0]!.key]).toMatchObject({
      quantity: 7,
      exact: "7",
      hasRecords: true,
    });
    expect(result.months[0]?.values[result.dimensions[0]!.key]).toMatchObject({
      quantity: null,
      exact: "0",
      hasRecords: false,
    });
    expect(result.months[10]?.isAfterSelected).toBe(true);
    expect(result.averages).toEqual([]);
  });

  it("should_preserve_recorded_zero_as_distinct_from_absence", () => {
    const result = buildDashboardProductionMonthlyData(
      [entry("2026-09", "0"), entry("2026-10", "7")],
      2026,
      10,
      "2026-10",
    );
    const unit = result.dimensions[0]!.key;

    expect(result.months[8]?.values[unit]).toMatchObject({
      quantity: 0,
      exact: "0",
      hasRecords: true,
    });
    expect(result.months[0]?.values[unit]?.hasRecords).toBe(false);
    expect(result.averages).toEqual([
      { dimension: "procedimentos · manual", value: "0" },
    ]);
  });

  it("should_keep_units_and_sources_separate_instead_of_summing_incompatible_series", () => {
    const result = buildDashboardProductionMonthlyData(
      [
        entry("2026-10", "7", "procedimentos", "manual"),
        entry("2026-10", "3", "exames", "manual"),
        entry("2026-10", "2", "procedimentos", "importacao"),
      ],
      2026,
      10,
      "2026-10",
    );

    expect(result.dimensions).toHaveLength(3);
    expect(result.yearComparisons).toEqual([]);
    expect(result.averages).toEqual([]);
    expect(result.months[9]?.values[result.dimensions[0]!.key]?.quantity).toBe(
      3,
    );
  });

  it("should_compare_only_a_matching_unit_and_source_with_prior_year_records", () => {
    const result = buildDashboardProductionMonthlyData(
      [entry("2025-10", "5"), entry("2026-09", "2"), entry("2026-10", "7")],
      2026,
      10,
      "2026-10",
    );

    expect(result.yearComparisons).toEqual([
      {
        current: "9",
        previous: "5",
        dimension: "procedimentos · manual",
      },
    ]);
  });
});
