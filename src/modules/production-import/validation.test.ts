import { describe, expect, it } from "vitest";
import {
  parseProductionImportPeriod,
  productionImportConfirmationSchema,
} from "./validation";

describe("production import validation", () => {
  it("should_normalize_competence_to_month_start_when_period_is_valid", () => {
    expect(parseProductionImportPeriod("2026-10")).toBe("2026-10-01");
  });

  it("should_reject_invalid_competence_when_month_is_out_of_range", () => {
    expect(() => parseProductionImportPeriod("2026-13")).toThrow(
      /competência mensal válida/,
    );
  });

  it("should_require_preview_evidence_and_mappings_when_confirming", () => {
    const base = {
      referencePeriod: "2026-10",
      delimiter: ";",
      columns: { procedure: 1, quantity: 2, sourceType: 3, code: 0 },
      mappings: {
        '["01","hemograma"]': "3a7ac6e8-5f2f-4d55-946c-4c047e6c5a0a",
      },
    };
    expect(productionImportConfirmationSchema.safeParse(base).success).toBe(
      false,
    );
    expect(
      productionImportConfirmationSchema.safeParse({
        ...base,
        previewToken: "signed",
      }).success,
    ).toBe(true);
  });
});
