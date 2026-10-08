import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requireFinanceAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from: mocks.from }),
}));
vi.mock("@/modules/finance/pharmacy/access", () => ({
  requireFinanceAdmin: mocks.requireFinanceAdmin,
}));

import { loadIndicatorsSource } from "./repository";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireFinanceAdmin.mockResolvedValue({ id: "admin" });
});

describe("financial indicators repository", () => {
  it("should_bound_purchase_rows_and_skip_product_loading_for_exports", async () => {
    const ids = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ];
    const items = ids.map((id) => ({
      id,
      product_id: "00000000-0000-4000-8000-000000000003",
      quantity: "1.000",
      unit_price: "10.00",
      line_total: "10.00",
      product_name_snapshot: "Produto sintético",
      product_presentation_snapshot: "Caixa",
      product_category_snapshot: null,
      purchase_order: {
        sector: "farmacia",
        order_date: "2026-10-08",
        supplier: {
          id: "00000000-0000-4000-8000-000000000004",
          name: "Fornecedor sintético",
        },
      },
    }));
    const calls: string[] = [];
    const ranges: Array<[number, number]> = [];

    mocks.from.mockImplementation((table: string) => {
      calls.push(table);
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        lt: () => query,
        order: () => query,
        range: (start: number, end: number) => {
          ranges.push([start, end]);
          return Promise.resolve({ data: items, error: null });
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    });

    const source = await loadIndicatorsSource("2026-10", "2026-10", {
      maxPurchaseRows: 2,
      includeProducts: false,
    });

    expect(source.purchases).toHaveLength(2);
    expect(source.products).toEqual([]);
    expect(ranges).toEqual([[0, 1]]);
    expect(calls).toEqual(["purchase_order_items", "monthly_fair_expenses"]);
    expect(mocks.requireFinanceAdmin).toHaveBeenCalledOnce();
  });
});
