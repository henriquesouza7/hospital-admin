import { describe, expect, it } from "vitest";
import { getLocalDateInputValue } from "./format";
import {
  calculateLineTotalCents,
  calculateOrderTotalCents,
  formatCents,
  productInputSchema,
  purchaseOrderInputSchema,
  supplierInputSchema,
} from "./validation";

describe("pharmacy input validation", () => {
  it("should_format_purchase_date_from_local_calendar_when_utc_day_differs", () => {
    const localDate = new Date(2026, 9, 6, 23, 30);

    expect(getLocalDateInputValue(localDate)).toBe("2026-10-06");
  });

  it("should_accept_supplier_when_name_is_present", () => {
    expect(
      supplierInputSchema.safeParse({
        name: "Distribuidora Sintética",
        notes: "",
      }).success,
    ).toBe(true);
  });

  it("should_reject_supplier_when_name_is_empty", () => {
    expect(
      supplierInputSchema.safeParse({ name: "  ", notes: "" }).success,
    ).toBe(false);
  });

  it("should_accept_product_without_price_when_required_fields_are_present", () => {
    expect(
      productInputSchema.safeParse({
        name: "Solução sintética",
        category: "Insumo",
        presentation: "Frasco 500 ml",
      }).success,
    ).toBe(true);
  });

  it("should_calculate_item_total_when_quantity_and_price_are_decimal_strings", () => {
    expect(formatCents(calculateLineTotalCents("2,500", "10,20"))).toBe(
      "25,50",
    );
  });

  it("should_calculate_order_total_when_multiple_items_are_present", () => {
    const total = calculateOrderTotalCents([
      { quantity: "2.500", unitPrice: "10.20" },
      { quantity: "3", unitPrice: "1.25" },
    ]);
    expect(formatCents(total)).toBe("29,25");
  });

  it("should_reject_order_when_quantity_is_zero", () => {
    expect(
      purchaseOrderInputSchema.safeParse({
        sector: "laboratorio",
        supplier_id: "f9a52c88-2973-4c38-8542-d7ce03122cc8",
        order_date: "2026-10-06",
        notes: "",
        items: [
          {
            product_id: "a07dd5df-a160-49f2-a55c-a51274683a02",
            quantity: "0",
            unit_price: "1.00",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("should_reject_order_when_unit_price_is_malformed", () => {
    expect(
      purchaseOrderInputSchema.safeParse({
        sector: "farmacia",
        supplier_id: "f9a52c88-2973-4c38-8542-d7ce03122cc8",
        order_date: "2026-10-06",
        notes: "",
        items: [
          {
            product_id: "a07dd5df-a160-49f2-a55c-a51274683a02",
            quantity: "1",
            unit_price: "-1.00",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("should_accept_laboratory_sector_when_order_is_valid", () => {
    expect(
      purchaseOrderInputSchema.safeParse({
        sector: "laboratorio",
        supplier_id: "f9a52c88-2973-4c38-8542-d7ce03122cc8",
        order_date: "2026-10-06",
        notes: "",
        items: [
          {
            product_id: "a07dd5df-a160-49f2-a55c-a51274683a02",
            quantity: "2.5",
            unit_price: "12.34",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("should_reject_order_when_sector_is_unsupported", () => {
    expect(
      purchaseOrderInputSchema.safeParse({
        sector: "feira",
        supplier_id: "f9a52c88-2973-4c38-8542-d7ce03122cc8",
        order_date: "2026-10-06",
        notes: "",
        items: [
          {
            product_id: "a07dd5df-a160-49f2-a55c-a51274683a02",
            quantity: "1",
            unit_price: "1.00",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
