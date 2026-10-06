import { describe, expect, it } from "vitest";
import {
  calculateMonthlyComparison,
  FairExpense,
  getAnnualSummary,
  previousCompetence,
} from "./domain";

function expense(competence: string, total_amount: string): FairExpense {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    competence: `${competence}-01`,
    total_amount,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("fair expense calculations", () => {
  it("should_find_the_previous_competence_when_month_changes_year", () => {
    expect(previousCompetence("2026-01-01")).toBe("2025-12");
  });

  it("should_calculate_difference_and_percentage_when_previous_month_exists", () => {
    const comparison = calculateMonthlyComparison(
      expense("2026-10", "11000.00"),
      expense("2026-09", "10000.00"),
    );

    expect(comparison).toEqual({
      differenceCents: BigInt(100000),
      percentageBasisPoints: BigInt(1000),
    });
  });

  it("should_calculate_negative_difference_and_percentage_when_total_decreases", () => {
    const comparison = calculateMonthlyComparison(
      expense("2026-10", "9000.00"),
      expense("2026-09", "10000.00"),
    );

    expect(comparison).toEqual({
      differenceCents: BigInt(-100000),
      percentageBasisPoints: BigInt(-1000),
    });
  });

  it("should_return_no_comparison_when_previous_month_is_missing", () => {
    expect(
      calculateMonthlyComparison(expense("2026-10", "11000.00"), undefined),
    ).toBeNull();
  });

  it("should_omit_percentage_when_previous_month_total_is_zero", () => {
    expect(
      calculateMonthlyComparison(
        expense("2026-02", "10.00"),
        expense("2026-01", "0.00"),
      ),
    ).toEqual({
      differenceCents: BigInt(1000),
      percentageBasisPoints: null,
    });
  });

  it("should_calculate_annual_total_and_average_over_registered_months", () => {
    expect(
      getAnnualSummary(
        [
          expense("2026-01", "10000.00"),
          expense("2026-02", "20000.00"),
          expense("2025-12", "90000.00"),
        ],
        2026,
      ),
    ).toEqual({
      totalCents: BigInt(3000000),
      averageCents: BigInt(1500000),
      monthCount: 2,
    });
  });

  it("should_return_zero_average_when_year_has_no_registered_months", () => {
    expect(getAnnualSummary([], 2026)).toEqual({
      totalCents: BigInt(0),
      averageCents: BigInt(0),
      monthCount: 0,
    });
  });
});
