import { describe, expect, it } from "vitest";
import {
  doctorNameSchema,
  doctorStatusSchema,
  doctorUpdateSchema,
  entryCreateSchema,
  entryUpdateSchema,
  targetCreateSchema,
  targetUpdateSchema,
} from "./validation";

describe("doctor validation", () => {
  it("should_trim_name_when_validating", () => {
    expect(doctorNameSchema.parse("  Dr. Médico Teste A  ")).toBe(
      "Dr. Médico Teste A",
    );
  });

  it("should_reject_empty_name_after_trim", () => {
    expect(doctorNameSchema.safeParse("   ").success).toBe(false);
  });

  it("should_reject_names_containing_only_whitespace", () => {
    for (const name of ["\t", " \t ", "\n", "\r\n\f"]) {
      expect(doctorNameSchema.safeParse(name).success).toBe(false);
    }
  });

  it("should_trim_mixed_outer_whitespace_without_collapsing_internal_spaces", () => {
    expect(doctorNameSchema.parse("\t Dr.  Teste\r\n")).toBe("Dr.  Teste");
  });

  it("should_reject_name_longer_than_160_characters", () => {
    expect(doctorNameSchema.safeParse("a".repeat(161)).success).toBe(false);
  });

  it("should_accept_valid_name_and_identifier_for_update", () => {
    expect(
      doctorUpdateSchema.safeParse({
        id: "20000000-0000-4000-8000-000000000001",
        name: "Dra. Médica Teste B",
      }).success,
    ).toBe(true);
  });

  it("should_parse_active_state_from_form_values", () => {
    expect(
      doctorStatusSchema.parse({
        id: "20000000-0000-4000-8000-000000000001",
        active: "false",
      }).active,
    ).toBe(false);
  });
});

describe("admission entry and target validation", () => {
  const doctorId = "20000000-0000-4000-8000-000000000001";
  const entryId = "20000000-0000-4000-8000-000000000002";
  const targetId = "20000000-0000-4000-8000-000000000003";

  it("should_accept_nonnegative_integer_entry_quantity_when_fields_are_valid", () => {
    expect(
      entryCreateSchema.parse({
        doctor_id: doctorId,
        entry_date: "2026-10-07",
        quantity: "0",
      }).quantity,
    ).toBe(0);
  });

  it("should_reject_negative_entry_quantity_when_value_is_below_zero", () => {
    expect(
      entryCreateSchema.safeParse({
        doctor_id: doctorId,
        entry_date: "2026-10-07",
        quantity: "-1",
      }).success,
    ).toBe(false);
  });

  it("should_reject_invalid_doctor_uuid_when_creating_entry", () => {
    expect(
      entryCreateSchema.safeParse({
        doctor_id: "invalid",
        entry_date: "2026-10-07",
        quantity: "1",
      }).success,
    ).toBe(false);
  });

  it("should_reject_impossible_calendar_date_when_creating_entry", () => {
    expect(
      entryCreateSchema.safeParse({
        doctor_id: doctorId,
        entry_date: "2026-02-30",
        quantity: "1",
      }).success,
    ).toBe(false);
  });

  it("should_validate_entry_update_identifier_and_quantity", () => {
    expect(
      entryUpdateSchema.safeParse({ id: entryId, quantity: "5" }).success,
    ).toBe(true);
    expect(
      entryUpdateSchema.safeParse({ id: "invalid", quantity: "5" }).success,
    ).toBe(false);
  });

  it("should_derive_month_start_from_monthly_target_period", () => {
    expect(
      targetCreateSchema.parse({
        period_type: "month",
        period: "2026-10",
        target_quantity: "30",
      }),
    ).toEqual({
      period_type: "month",
      reference_period: "2026-10-01",
      target_quantity: 30,
    });
  });

  it("should_derive_year_start_from_annual_target_period", () => {
    expect(
      targetCreateSchema.parse({
        period_type: "year",
        period: "2026",
        target_quantity: "365",
      }),
    ).toEqual({
      period_type: "year",
      reference_period: "2026-01-01",
      target_quantity: 365,
    });
  });

  it("should_reject_invalid_target_competence_and_negative_amount", () => {
    expect(
      targetCreateSchema.safeParse({
        period_type: "month",
        period: "2026-13",
        target_quantity: "1",
      }).success,
    ).toBe(false);
    expect(
      targetCreateSchema.safeParse({
        period_type: "year",
        period: "2026",
        target_quantity: "-2",
      }).success,
    ).toBe(false);
  });

  it("should_accept_year_2100_for_monthly_and_annual_targets", () => {
    expect(
      targetCreateSchema.parse({
        period_type: "year",
        period: "2100",
        target_quantity: "1",
      }).reference_period,
    ).toBe("2100-01-01");
    expect(
      targetCreateSchema.parse({
        period_type: "month",
        period: "2100-01",
        target_quantity: "1",
      }).reference_period,
    ).toBe("2100-01-01");
    expect(
      targetCreateSchema.parse({
        period_type: "month",
        period: "2100-12",
        target_quantity: "1",
      }).reference_period,
    ).toBe("2100-12-01");
  });

  it("should_reject_target_years_outside_1900_through_2100", () => {
    for (const period of ["1899", "2101"]) {
      expect(
        targetCreateSchema.safeParse({
          period_type: "year",
          period,
          target_quantity: "1",
        }).success,
      ).toBe(false);
    }
  });

  it("should_reject_invalid_months_in_year_2100", () => {
    for (const period of ["2100-00", "2100-13"]) {
      expect(
        targetCreateSchema.safeParse({
          period_type: "month",
          period,
          target_quantity: "1",
        }).success,
      ).toBe(false);
    }
  });

  it("should_reject_periods_that_do_not_match_the_selected_type", () => {
    for (const input of [
      { period_type: "year", period: "2026-12" },
      { period_type: "month", period: "2026-10-extra" },
    ]) {
      expect(
        targetCreateSchema.safeParse({
          ...input,
          target_quantity: "1",
        }).success,
      ).toBe(false);
    }
  });

  it("should_validate_target_update_identifier_and_quantity", () => {
    expect(
      targetUpdateSchema.safeParse({ id: targetId, target_quantity: "15" })
        .success,
    ).toBe(true);
    expect(
      targetUpdateSchema.safeParse({ id: targetId, target_quantity: "-1" })
        .success,
    ).toBe(false);
  });
});
