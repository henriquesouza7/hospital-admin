import { describe, expect, it } from "vitest";
import {
  canConfirmFiscalImport,
  fiscalConfirmationSchema,
  hasUniqueProductMappings,
  isValidPurchaseQuantity,
  isValidPurchaseUnitPrice,
  validateNfeItemMapping,
} from "./validation";

const validDraft = {
  sector: "farmacia",
  supplierId: "20000000-0000-4000-8000-000000000001",
  allowedProductIds: [
    "20000000-0000-4000-8000-000000000002",
    "20000000-0000-4000-8000-000000000003",
  ],
  items: [
    {
      productId: "20000000-0000-4000-8000-000000000002",
      quantity: "2.125",
      unitPrice: "10.25",
    },
  ],
};

describe("validateNfeItemMapping", () => {
  it("should_accept_exact_item_set_when_every_invoice_line_is_mapped_once", () => {
    expect(validateNfeItemMapping(["1", "2"], ["2", "1"])).toBe(true);
  });

  it("should_reject_missing_extra_or_duplicate_items_when_confirming", () => {
    expect(validateNfeItemMapping(["1", "2"], ["1"])).toBe(false);
    expect(validateNfeItemMapping(["1", "2"], ["1", "2", "3"])).toBe(false);
    expect(validateNfeItemMapping(["1", "2"], ["1", "1"])).toBe(false);
  });

  it("should_reject_repeated_products_when_two_invoice_lines_map_to_one_product", () => {
    expect(hasUniqueProductMappings(["a", "b"])).toBe(true);
    expect(hasUniqueProductMappings(["a", "a"])).toBe(false);
  });

  it("should_accept_purchase_precision_when_quantity_has_three_decimals_and_price_has_two", () => {
    const input = {
      sector: "farmacia",
      supplierId: "20000000-0000-4000-8000-000000000001",
      orderDate: "2026-10-01",
      notes: "",
      previewToken: "server-signed-evidence",
      items: [
        {
          itemNumber: "1",
          productId: "20000000-0000-4000-8000-000000000002",
          quantity: "2.125",
          unitPrice: "10.25",
        },
      ],
    };
    expect(fiscalConfirmationSchema.safeParse(input).success).toBe(true);
  });

  it("should_reject_values_exceeding_purchase_precision_or_zero_quantity", () => {
    const input = {
      sector: "farmacia",
      supplierId: "20000000-0000-4000-8000-000000000001",
      orderDate: "2026-10-01",
      notes: "",
      previewToken: "server-signed-evidence",
      items: [
        {
          itemNumber: "1",
          productId: "20000000-0000-4000-8000-000000000002",
          quantity: "2.1254",
          unitPrice: "10.25",
        },
      ],
    };
    expect(fiscalConfirmationSchema.safeParse(input).success).toBe(false);
    expect(
      fiscalConfirmationSchema.safeParse({
        ...input,
        items: [{ ...input.items[0], quantity: "0" }],
      }).success,
    ).toBe(false);
    expect(
      fiscalConfirmationSchema.safeParse({
        ...input,
        items: [{ ...input.items[0], quantity: "2.125", unitPrice: "10.251" }],
      }).success,
    ).toBe(false);
  });
});

describe("canConfirmFiscalImport", () => {
  it("should_allow_complete_mappings_with_valid_revised_values", () => {
    expect(canConfirmFiscalImport(validDraft)).toBe(true);
  });

  it("should_reject_missing_sector_supplier_or_product_mapping", () => {
    expect(canConfirmFiscalImport({ ...validDraft, sector: "" })).toBe(false);
    expect(canConfirmFiscalImport({ ...validDraft, supplierId: "" })).toBe(
      false,
    );
    expect(
      canConfirmFiscalImport({
        ...validDraft,
        items: [{ ...validDraft.items[0], productId: "" }],
      }),
    ).toBe(false);
  });

  it("should_reject_duplicate_or_wrong_sector_products", () => {
    const productId = validDraft.items[0].productId;
    expect(
      canConfirmFiscalImport({
        ...validDraft,
        allowedProductIds: ["20000000-0000-4000-8000-000000000003"],
      }),
    ).toBe(false);
    expect(
      canConfirmFiscalImport({
        ...validDraft,
        items: [...validDraft.items, { ...validDraft.items[0], productId }],
      }),
    ).toBe(false);
  });

  it("should_reject_empty_nonpositive_or_overprecision_revised_values", () => {
    for (const quantity of ["", "0", "-1", "1.0001"]) {
      expect(isValidPurchaseQuantity(quantity)).toBe(false);
      expect(
        canConfirmFiscalImport({
          ...validDraft,
          items: [{ ...validDraft.items[0], quantity }],
        }),
      ).toBe(false);
    }
    for (const unitPrice of ["", "-1", "10.001"]) {
      expect(isValidPurchaseUnitPrice(unitPrice)).toBe(false);
      expect(
        canConfirmFiscalImport({
          ...validDraft,
          items: [{ ...validDraft.items[0], unitPrice }],
        }),
      ).toBe(false);
    }
  });

  it("should_accept_corrected_precision_and_reject_invalid_edits", () => {
    expect(isValidPurchaseQuantity("2.125")).toBe(true);
    expect(isValidPurchaseUnitPrice("10.25")).toBe(true);
    expect(
      canConfirmFiscalImport({
        ...validDraft,
        items: [{ ...validDraft.items[0], quantity: "2", unitPrice: "10.25" }],
      }),
    ).toBe(true);
  });
});
