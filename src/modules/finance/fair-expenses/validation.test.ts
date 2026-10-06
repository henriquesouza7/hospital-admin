import { describe, expect, it } from "vitest";
import { fairExpenseInputSchema } from "./validation";

describe("fair expense validation", () => {
  it("should_convert_a_valid_competence_when_month_is_submitted", () => {
    expect(
      fairExpenseInputSchema.parse({
        competence: "2026-10",
        total_amount: "1250.5",
        notes: "  compra mensal  ",
      }),
    ).toEqual({
      competence: "2026-10-01",
      total_amount: "1250.50",
      notes: "compra mensal",
    });
  });

  it("should_reject_an_invalid_competence_when_month_is_malformed", () => {
    for (const competence of ["2026-13", "2026-00", "2026-2", "2026-02-01"]) {
      expect(
        fairExpenseInputSchema.safeParse({
          competence,
          total_amount: "10.00",
          notes: "",
        }).success,
      ).toBe(false);
    }
  });

  it("should_normalize_comma_decimal_when_amount_is_valid", () => {
    expect(
      fairExpenseInputSchema.parse({
        competence: "2026-02",
        total_amount: "10,5",
        notes: "",
      }).total_amount,
    ).toBe("10.50");
  });

  it("should_reject_negative_amount_when_monthly_total_is_submitted", () => {
    expect(
      fairExpenseInputSchema.safeParse({
        competence: "2026-02",
        total_amount: "-0.01",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("should_reject_excess_precision_when_amount_has_more_than_two_decimals", () => {
    expect(
      fairExpenseInputSchema.safeParse({
        competence: "2026-02",
        total_amount: "10.001",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("should_reject_notes_over_one_thousand_characters", () => {
    expect(
      fairExpenseInputSchema.safeParse({
        competence: "2026-02",
        total_amount: "10.00",
        notes: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});
