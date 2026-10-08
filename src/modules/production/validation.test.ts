import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  productionEntryInputSchema,
  procedureInputSchema,
} from "./validation";

const validProcedureId = "f10a7281-2a42-4fd4-b7f5-d5b7d46d54bd";
const validCategoryId = "d6bcb317-a52e-4b88-a97b-ad993e8f4010";

describe("category validation", () => {
  it("trims a valid category name", () => {
    expect(categoryInputSchema.parse({ name: "  Laboratório  " }).name).toBe(
      "Laboratório",
    );
  });

  it("rejects empty and oversized category names", () => {
    expect(categoryInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(
      categoryInputSchema.safeParse({ name: "x".repeat(121) }).success,
    ).toBe(false);
  });
});

describe("procedure validation", () => {
  it("requires category, name, and counting unit", () => {
    expect(
      procedureInputSchema.safeParse({
        category_id: validCategoryId,
        name: " ECG ",
        counting_unit: " exame ",
      }).data,
    ).toEqual({
      category_id: validCategoryId,
      name: "ECG",
      counting_unit: "exame",
    });
    expect(
      procedureInputSchema.safeParse({ name: "ECG", counting_unit: "exame" })
        .success,
    ).toBe(false);
  });

  it("rejects invalid category IDs and missing units", () => {
    expect(
      procedureInputSchema.safeParse({
        category_id: "invalid",
        name: "ECG",
        counting_unit: "exame",
      }).success,
    ).toBe(false);
    expect(
      procedureInputSchema.safeParse({
        category_id: validCategoryId,
        name: "ECG",
        counting_unit: " ",
      }).success,
    ).toBe(false);
  });
});

describe("production entry validation", () => {
  const input = {
    procedure_id: validProcedureId,
    reference_period: "2026-03",
    quantity: "12",
    source: " manual ",
  };

  it("normalizes competence and source", () => {
    expect(productionEntryInputSchema.parse(input)).toEqual({
      ...input,
      reference_period: "2026-03-01",
      source: "manual",
    });
  });

  it("rejects invalid month, negative or fractional quantity, and empty source", () => {
    expect(
      productionEntryInputSchema.safeParse({
        ...input,
        reference_period: "2026-13",
      }).success,
    ).toBe(false);
    expect(
      productionEntryInputSchema.safeParse({ ...input, quantity: "-1" })
        .success,
    ).toBe(false);
    expect(
      productionEntryInputSchema.safeParse({ ...input, quantity: "1.5" })
        .success,
    ).toBe(false);
    expect(
      productionEntryInputSchema.safeParse({ ...input, source: " " }).success,
    ).toBe(false);
  });
});
