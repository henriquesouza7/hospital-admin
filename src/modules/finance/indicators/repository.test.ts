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
  it("should_page_through_the_global_purchase_limit_without_truncating", async () => {
    const items = Array.from({ length: 1_001 }, (_, index) => {
      const id =
        "00000000-0000-4000-8000-" + String(index + 1).padStart(12, "0");
      return {
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
      };
    });
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
          return Promise.resolve({
            data: items.slice(start, end + 1),
            error: null,
          });
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    });

    const source = await loadIndicatorsSource("2026-10", "2026-10", {
      maxPurchaseRows: 1_001,
      includeProducts: false,
    });

    expect(source.purchases).toHaveLength(1_001);
    expect(source.products).toEqual([]);
    expect(ranges).toEqual([
      [0, 999],
      [1_000, 1_000],
    ]);
    expect(calls).toEqual([
      "purchase_order_items",
      "purchase_order_items",
      "monthly_fair_expenses",
    ]);
    expect(mocks.requireFinanceAdmin).toHaveBeenCalledOnce();
  });
});
