import { describe, expect, it } from "vitest";
import { getInitialDashboardFinancialSeries } from "./finance-quality";

describe("dashboard financial series selection", () => {
  it("should_choose_the_first_series_with_operational_records", () => {
    expect(
      getInitialDashboardFinancialSeries({
        pharmacy: false,
        laboratory: false,
        fair: true,
        total: false,
      }),
    ).toBe("fair");
  });

  it("should_prefer_total_when_operational_records_exist", () => {
    expect(
      getInitialDashboardFinancialSeries({
        pharmacy: true,
        laboratory: true,
        fair: true,
        total: true,
      }),
    ).toBe("total");
  });
});
