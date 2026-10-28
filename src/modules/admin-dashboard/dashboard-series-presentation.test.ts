import { describe, expect, it } from "vitest";
import { getDashboardSeriesMode } from "./dashboard-series-presentation";

describe("dashboard sparse series presentation", () => {
  it("should_show_empty_state_when_no_period_has_records", () => {
    expect(
      getDashboardSeriesMode([{ hasRecords: false }, { hasRecords: false }]),
    ).toBe("empty");
  });

  it("should_show_summary_when_one_period_has_records_even_if_value_is_zero", () => {
    const registeredZero = { hasRecords: true, value: 0 };
    expect(
      getDashboardSeriesMode([{ hasRecords: false }, registeredZero]),
    ).toBe("summary");
  });

  it("should_compare_exactly_two_recorded_periods", () => {
    expect(
      getDashboardSeriesMode([
        { hasRecords: true },
        { hasRecords: false },
        { hasRecords: true },
      ]),
    ).toBe("comparison");
  });

  it("should_keep_monthly_financial_charts_visible_for_sparse_series", () => {
    expect(
      getDashboardSeriesMode(
        [{ hasRecords: false }, { hasRecords: true }, { hasRecords: false }],
        true,
      ),
    ).toBe("chart");
  });

  it("should_keep_the_chart_frame_when_all_values_are_unavailable", () => {
    expect(
      getDashboardSeriesMode(
        [{ hasRecords: false }, { hasRecords: false }],
        true,
      ),
    ).toBe("chart");
  });

  it("should_render_a_chart_only_when_at_least_three_periods_have_records", () => {
    expect(
      getDashboardSeriesMode([
        { hasRecords: true },
        { hasRecords: true },
        { hasRecords: true },
      ]),
    ).toBe("chart");
  });
});
