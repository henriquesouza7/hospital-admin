import { describe, expect, it } from "vitest";
import {
  calculateAnnualComparison,
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

function yearExpenses(
  year: number,
  months: readonly string[],
  total: (month: string) => string,
): FairExpense[] {
  return months.map((month) => expense(`${year}-${month}`, total(month)));
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

  it("should_compare_complete_years_when_all_twelve_months_exist", () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    const comparison = calculateAnnualComparison(
      [
        ...yearExpenses(2025, months, () => "1000.00"),
        ...yearExpenses(2026, months, () => "1100.00"),
      ],
      2026,
    );

    expect(comparison).toEqual({
      status: "comparable",
      previousYear: 2025,
      currentCents: BigInt(1320000),
      previousCents: BigInt(1200000),
      differenceCents: BigInt(120000),
      percentageBasisPoints: BigInt(1000),
      monthCount: 12,
      competences: months.map((month) => `2026-${month}`),
    });
  });

  it("should_compare_only_the_same_months_for_a_partial_year", () => {
    const comparison = calculateAnnualComparison(
      [
        ...yearExpenses(2025, ["01", "02", "03", "04"], () => "900.00"),
        ...yearExpenses(2026, ["03", "01"], (month) =>
          month === "01" ? "1000.00" : "1200.00",
        ),
      ],
      2026,
    );

    expect(comparison).toEqual({
      status: "comparable",
      previousYear: 2025,
      currentCents: BigInt(220000),
      previousCents: BigInt(180000),
      differenceCents: BigInt(40000),
      percentageBasisPoints: BigInt(2222),
      monthCount: 2,
      competences: ["2026-01", "2026-03"],
    });
  });

  it("should_mark_the_comparison_incomplete_when_a_matching_month_is_missing", () => {
    expect(
      calculateAnnualComparison(
        [
          ...yearExpenses(2025, ["01"], () => "900.00"),
          ...yearExpenses(2026, ["01", "02"], () => "1000.00"),
        ],
        2026,
      ),
    ).toEqual({
      status: "incomplete_previous",
      previousYear: 2025,
      currentCents: BigInt(200000),
      expectedMonths: 2,
      availableMonths: 1,
    });
  });

  it("should_report_no_comparison_when_the_selected_year_has_no_records", () => {
    expect(
      calculateAnnualComparison(
        yearExpenses(2025, ["01"], () => "900.00"),
        2026,
      ),
    ).toEqual({ status: "no_current_data", previousYear: 2025 });
  });

  it("should_report_no_previous_period_when_the_previous_year_is_absent", () => {
    expect(
      calculateAnnualComparison(
        yearExpenses(2026, ["01", "02"], () => "1000.00"),
        2026,
      ),
    ).toEqual({
      status: "incomplete_previous",
      previousYear: 2025,
      currentCents: BigInt(200000),
      expectedMonths: 2,
      availableMonths: 0,
    });
  });

  it("should_omit_percentage_when_the_equivalent_previous_period_is_zero", () => {
    expect(
      calculateAnnualComparison(
        [
          ...yearExpenses(2025, ["01", "02"], () => "0.00"),
          ...yearExpenses(2026, ["01", "02"], () => "100.00"),
        ],
        2026,
      ),
    ).toMatchObject({
      status: "comparable",
      differenceCents: BigInt(20000),
      percentageBasisPoints: null,
      monthCount: 2,
    });
  });

  it("should_calculate_negative_annual_difference_and_percentage", () => {
    expect(
      calculateAnnualComparison(
        [
          ...yearExpenses(2025, ["01", "02"], () => "100.00"),
          ...yearExpenses(2026, ["01", "02"], () => "90.00"),
        ],
        2026,
      ),
    ).toMatchObject({
      status: "comparable",
      differenceCents: BigInt(-2000),
      percentageBasisPoints: BigInt(-1000),
      monthCount: 2,
    });
  });
});
