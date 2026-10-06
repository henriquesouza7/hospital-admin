import { describe, expect, it } from "vitest";
import { purchaseOrderDetailSchema } from "./purchase-order-detail";

describe("purchase order history", () => {
  it("should_require_product_snapshots_when_parsing_historical_items", () => {
    const result = purchaseOrderDetailSchema.safeParse({
      id: "d0303d04-5e1e-4c7f-a35e-55ee64933c09",
      order_date: "2026-10-06",
      notes: null,
      supplier: { name: "Fornecedor Sintético" },
      items: [
        {
          id: "cf019258-908d-4b14-88ed-8f12a94ca765",
          quantity: "100",
          unit_price: "15.00",
          line_total: "1500.00",
          product_name_snapshot: "Produto Sintético",
          product_presentation_snapshot: "Caixa com 20 unidades",
          product_category_snapshot: "Insumo",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.items[0]).toMatchObject({
      product_name_snapshot: "Produto Sintético",
      product_presentation_snapshot: "Caixa com 20 unidades",
    });
  });

  it("should_reject_historical_item_when_required_product_snapshot_is_missing", () => {
    const result = purchaseOrderDetailSchema.safeParse({
      id: "d0303d04-5e1e-4c7f-a35e-55ee64933c09",
      order_date: "2026-10-06",
      notes: null,
      supplier: { name: "Fornecedor Sintético" },
      items: [
        {
          id: "cf019258-908d-4b14-88ed-8f12a94ca765",
          quantity: "100",
          unit_price: "15.00",
          line_total: "1500.00",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
