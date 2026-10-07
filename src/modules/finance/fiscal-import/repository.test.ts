import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseNfeXml } from "./domain";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireFinanceAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("../pharmacy/access", () => ({
  requireFinanceAdmin: mocks.requireFinanceAdmin,
}));

import { createFiscalPurchaseOrder } from "./repository";

const xml = readFileSync(
  new URL(
    "../../../../tests/fixtures/fiscal-import/nfe-d-revisada-farmacia.xml",
    import.meta.url,
  ),
  "utf8",
);
const productIds = [
  "20000000-0000-4000-8000-000000000002",
  "20000000-0000-4000-8000-000000000003",
];
const orderId = "20000000-0000-4000-8000-000000000099";
const rpcFiscalItemFields = [
  "n_item",
  "supplier_product_code",
  "product_description",
  "commercial_unit",
  "original_quantity",
  "original_unit_price",
  "original_product_total",
  "product_id",
];

describe("fiscal import repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFinanceAdmin.mockResolvedValue({ id: "admin-user-id" });
    mocks.rpc.mockResolvedValue({ data: orderId, error: null });
  });

  it("should_send_sql_contract_keys_when_creating_fiscal_order", async () => {
    const document = parseNfeXml(xml);
    const fiscalItems = [
      {
        n_item: "1",
        supplier_product_code: "FICT-FAR-01",
        product_description: "Produto Fictício Farmácia A",
        commercial_unit: "CX",
        original_quantity: "2.0004",
        original_unit_price: "10.001",
        original_product_total: "20.01",
        product_id: productIds[0],
      },
      {
        n_item: "2",
        supplier_product_code: "FICT-FAR-02",
        product_description: "Produto Fictício Farmácia B",
        commercial_unit: "UN",
        original_quantity: "3.000",
        original_unit_price: "10.00",
        original_product_total: "30.00",
        product_id: productIds[1],
      },
    ];

    await createFiscalPurchaseOrder({
      sector: "farmacia",
      supplierId: "20000000-0000-4000-8000-000000000001",
      orderDate: document.orderDate,
      notes: "Importação sintética de teste",
      items: [
        {
          product_id: productIds[0],
          quantity: "1.500",
          unit_price: "12.34",
        },
        {
          product_id: productIds[1],
          quantity: "3.000",
          unit_price: "10.00",
        },
      ],
      fiscalItems,
      document,
      xmlSha256: "a".repeat(64),
    });

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_fiscal_import_purchase_order",
      expect.objectContaining({ p_fiscal_items: fiscalItems }),
    );

    const [, payload] = mocks.rpc.mock.calls[0] as [
      string,
      { p_fiscal_items: Record<string, string>[] },
    ];
    expect(payload.p_fiscal_items).toHaveLength(2);
    for (const item of payload.p_fiscal_items) {
      expect(Object.keys(item).sort()).toEqual([...rpcFiscalItemFields].sort());
      expect(item).not.toHaveProperty("c_prod");
      expect(item).not.toHaveProperty("x_prod");
      expect(item).not.toHaveProperty("u_com");
      expect(item).not.toHaveProperty("q_com");
      expect(item).not.toHaveProperty("v_un_com");
      expect(item).not.toHaveProperty("v_prod");
    }
    expect(payload.p_fiscal_items).toEqual([
      expect.objectContaining({
        n_item: "1",
        supplier_product_code: "FICT-FAR-01",
        product_description: "Produto Fictício Farmácia A",
        commercial_unit: "CX",
        original_quantity: "2.0004",
        original_unit_price: "10.001",
        original_product_total: "20.01",
        product_id: productIds[0],
      }),
      expect.objectContaining({
        n_item: "2",
        supplier_product_code: "FICT-FAR-02",
        product_description: "Produto Fictício Farmácia B",
        commercial_unit: "UN",
        original_quantity: "3.000",
        original_unit_price: "10.00",
        original_product_total: "30.00",
        product_id: productIds[1],
      }),
    ]);
  });
});
