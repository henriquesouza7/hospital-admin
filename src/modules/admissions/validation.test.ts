import { describe, expect, it } from "vitest";
import {
  doctorNameSchema,
  doctorStatusSchema,
  doctorUpdateSchema,
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
