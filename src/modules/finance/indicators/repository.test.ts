import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  requireFinanceAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/modules/finance/pharmacy/access", () => ({
  requireFinanceAdmin: mocks.requireFinanceAdmin,
}));

import {
  listMonthlyExpenseTotals,
  loadIndicatorsSource,
  MonthlyExpenseTotalsRpcUnavailableError,
} from "./repository";
import { amountToCents } from "./domain";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireFinanceAdmin.mockResolvedValue({ id: "admin" });
});

describe("financial indicators repository", () => {
  it("should_get_monthly_expense_totals_from_the_database", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          competence: "2026-10-01",
          pharmacy_total: "123.45",
          laboratory_total: "67.89",
          fair_total: "10.00",
          pharmacy_item_count: 1,
          laboratory_item_count: 2,
          has_fair_record: true,
        },
      ],
      error: null,
    });

    await expect(
      listMonthlyExpenseTotals("2026-10", "2026-10"),
    ).resolves.toEqual([
      {
        competence: "2026-10-01",
        pharmacy_total: "123.45",
        laboratory_total: "67.89",
        fair_total: "10.00",
        pharmacy_item_count: 1,
        laboratory_item_count: 2,
        has_fair_record: true,
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "list_monthly_expense_totals_exact",
      {
        p_start: "2026-10-01",
        p_through_exclusive: "2026-11-01",
      },
    );
    expect(mocks.requireFinanceAdmin).toHaveBeenCalledOnce();
  });

  it("should_preserve_exact_totals_through_sql_and_serialized_json", async () => {
    const migration = await readFile(
      new URL(
        "../../../../db/migrations/20261009020000_preserve_exact_financial_export_totals.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain("pharmacy_total text");
    expect(migration).toContain(
      "coalesce(purchase_totals.pharmacy_total, 0)::numeric::text",
    );

    const responseBody =
      '[{"competence":"2026-10-01","pharmacy_total":"90071992547409.93","laboratory_total":"0.00","fair_total":"0.00","pharmacy_item_count":1,"laboratory_item_count":0,"has_fair_record":false}]';
    const response = new Response(responseBody, {
      headers: { "content-type": "application/json" },
    });
    mocks.rpc.mockImplementation(async () => ({
      data: await response.json(),
      error: null,
    }));

    const totals = await listMonthlyExpenseTotals("2026-10", "2026-10");

    expect(totals[0]?.pharmacy_total).toBe("90071992547409.93");
    expect(amountToCents(totals[0]?.pharmacy_total ?? "")).toBe(
      BigInt("9007199254740993"),
    );
    expect(JSON.stringify(totals)).toContain(
      '"pharmacy_total":"90071992547409.93"',
    );
  });

  it("should_reject_number_valued_monthly_totals_to_prevent_precision_loss", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          competence: "2026-10-01",
          pharmacy_total: 90071992547409.94,
          laboratory_total: "0.00",
          fair_total: "0.00",
          pharmacy_item_count: 1,
          laboratory_item_count: 0,
          has_fair_record: false,
        },
      ],
      error: null,
    });

    await expect(
      listMonthlyExpenseTotals("2026-10", "2026-10"),
    ).rejects.toThrow();
  });

  it("should_identify_when_the_exact_totals_rpc_is_not_installed", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Missing function from the schema cache",
      },
    });

    await expect(
      listMonthlyExpenseTotals("2026-10", "2026-10"),
    ).rejects.toBeInstanceOf(MonthlyExpenseTotalsRpcUnavailableError);
  });

  it("should_use_one_snapshot_rpc_for_capped_purchase_exports", async () => {
    const snapshotItem = {
      id: "00000000-0000-4000-8000-000000000001",
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
    mocks.rpc.mockResolvedValue({ data: [snapshotItem], error: null });
    const tables: string[] = [];
    mocks.from.mockImplementation((table: string) => {
      tables.push(table);
      const query = {
        select: () => query,
        gte: () => query,
        lt: () => query,
        order: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    });

    const source = await loadIndicatorsSource("2026-10", "2026-10", {
      maxPurchaseRows: 1_001,
      includeProducts: false,
    });

    expect(source.purchases).toHaveLength(1);
    expect(source.purchases[0]?.id).toBe(snapshotItem.id);
    expect(source.products).toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "list_purchase_order_items_for_export",
      {
        p_start: "2026-10-01",
        p_through_exclusive: "2026-11-01",
        p_limit: 1_001,
      },
    );
    expect(tables).toEqual(["monthly_fair_expenses"]);
    expect(mocks.requireFinanceAdmin).toHaveBeenCalledOnce();
  });
});
