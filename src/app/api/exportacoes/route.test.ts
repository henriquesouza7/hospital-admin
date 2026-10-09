import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listAdmissionEntries: vi.fn(),
  listAdmissionEntriesForExport: vi.fn(),
  listAdmissionTargets: vi.fn(),
  listMonthlyExpenseTotals: vi.fn(),
  amountToCents: vi.fn((value: string) => {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) throw new Error("Valor monetário inválido recebido do banco.");
    return (
      BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"))
    );
  }),
  loadIndicatorsSource: vi.fn(),
  listProductionEntriesForExport: vi.fn(),
  getSurgerySummary: vi.fn(),
  buildCsv: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/modules/admissions/repository", () => ({
  listAdmissionEntries: mocks.listAdmissionEntries,
  listAdmissionEntriesForExport: mocks.listAdmissionEntriesForExport,
  listAdmissionTargets: mocks.listAdmissionTargets,
}));
vi.mock("@/modules/finance/indicators/repository", () => ({
  listMonthlyExpenseTotals: mocks.listMonthlyExpenseTotals,
  loadIndicatorsSource: mocks.loadIndicatorsSource,
}));
vi.mock("@/modules/finance/indicators/domain", () => ({
  amountToCents: mocks.amountToCents,
}));
vi.mock("@/modules/audit/domain", () => ({
  buildCsv: (rows: readonly (readonly unknown[])[]) =>
    rows
      .map((row) => row.map((value) => JSON.stringify(String(value))).join(","))
      .join("\n"),
}));
vi.mock("@/modules/production/repository", () => ({
  listProductionEntriesForExport: mocks.listProductionEntriesForExport,
}));
vi.mock("@/modules/minor-surgeries/repository", () => ({
  getSurgerySummary: mocks.getSurgerySummary,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.listAdmissionTargets.mockResolvedValue([
    {
      id: "monthly-october",
      period_type: "month",
      reference_period: "2026-10-01",
      target_quantity: 10,
    },
    {
      id: "annual-2026",
      period_type: "year",
      reference_period: "2026-01-01",
      target_quantity: 100,
    },
    {
      id: "monthly-september",
      period_type: "month",
      reference_period: "2026-09-01",
      target_quantity: 9,
    },
    {
      id: "annual-2027",
      period_type: "year",
      reference_period: "2027-01-01",
      target_quantity: 120,
    },
  ]);
});

describe("administrative exports", () => {
  it("should_bound_surgery_export_and_count_the_waitlist_in_the_database", async () => {
    mocks.getSurgerySummary.mockResolvedValue({
      days: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          procedure_date: "2026-10-08",
          capacity: 10,
          occupied: 2,
          awaiting_confirmation: 1,
          confirmed: 1,
        },
      ],
      has_more: false,
      day_count: 1,
      waiting_count: 3,
      capacity: 10,
      occupied: 2,
      awaiting_confirmation: 1,
      confirmed: 1,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=cirurgias&inicio=2026-10&fim=2026-10",
      ),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(mocks.getSurgerySummary).toHaveBeenCalledWith(
      "2026-10-01",
      "2026-11-01",
      10_001,
    );
    expect(csv).toContain('"Fila atual","","","","","3"');
  });

  it("should_reject_surgery_export_when_the_database_summary_exceeds_the_cap", async () => {
    mocks.getSurgerySummary.mockResolvedValue({
      days: [],
      has_more: true,
      day_count: 10_002,
      waiting_count: 0,
      capacity: 0,
      occupied: 0,
      awaiting_confirmation: 0,
      confirmed: 0,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=cirurgias&inicio=2026-10&fim=2026-10",
      ),
    );

    expect(response.status).toBe(413);
    expect(mocks.getSurgerySummary).toHaveBeenCalledWith(
      "2026-10-01",
      "2026-11-01",
      10_001,
    );
  });

  it("should_export_expense_totals_without_number_precision_loss", async () => {
    mocks.listMonthlyExpenseTotals.mockResolvedValue([
      {
        competence: "2026-10-01",
        pharmacy_total: "90071992547409.93",
        laboratory_total: "0.00",
        fair_total: "0.00",
        pharmacy_item_count: 1,
        laboratory_item_count: 0,
        has_fair_record: false,
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=gastos&inicio=2026-10&fim=2026-10",
      ),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('"90071992547409,93"');
    expect(mocks.loadIndicatorsSource).not.toHaveBeenCalled();
  });

  it("should_bound_admission_export_before_building_csv", async () => {
    mocks.listAdmissionEntriesForExport.mockResolvedValue(
      Array.from({ length: 10_001 }, () => ({
        entry_date: "2026-10-08",
        doctor_name: "Médico sintético",
        quantity: 1,
      })),
    );

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=internacoes&inicio=2026-10&fim=2026-10",
      ),
    );

    expect(response.status).toBe(413);
    expect(mocks.listAdmissionEntriesForExport).toHaveBeenCalledWith(
      "2026-10-01",
      "2026-11-01",
      10_001,
    );
  });

  it("should_accept_exactly_maximum_production_data_rows", async () => {
    mocks.listProductionEntriesForExport.mockResolvedValue(
      Array.from({ length: 10_000 }, () => ({
        reference_period: "2026-10-01",
        category_name: "Categoria sintética",
        procedure_name: "Procedimento sintético",
        quantity: "1.000",
        counting_unit: "atendimentos",
        source: "manual",
      })),
    );

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=producao&inicio=2026-10&fim=2026-10",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.listProductionEntriesForExport).toHaveBeenCalledWith(
      "2026-10-01",
      "2026-11-01",
      10_001,
    );
  });

  it("should_bound_purchase_export_and_skip_unneeded_products", async () => {
    mocks.loadIndicatorsSource.mockResolvedValue({
      purchases: Array.from({ length: 10_001 }, () => ({})),
      fairExpenses: [],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=compras&inicio=2026-10&fim=2026-10",
      ),
    );

    expect(response.status).toBe(413);
    expect(mocks.loadIndicatorsSource).toHaveBeenCalledWith(
      "2026-10",
      "2026-10",
      {
        maxPurchaseRows: 10_001,
        includeProducts: false,
      },
    );
  });

  it("should_localize_production_quantities_in_csv", async () => {
    mocks.listProductionEntriesForExport.mockResolvedValue([
      {
        reference_period: "2026-10-01",
        category_name: "Categoria sintética",
        procedure_name: "Procedimento sintético",
        quantity: "12.000",
        counting_unit: "atendimentos",
        source: "manual",
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=producao&inicio=2026-10&fim=2026-10",
      ),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('"12,000"');
  });

  it("should_use_comma_decimals_for_purchase_and_fair_amounts", async () => {
    mocks.loadIndicatorsSource.mockResolvedValue({
      purchases: [
        {
          orderDate: "2026-10-08",
          sector: "farmacia",
          supplierName: "Fornecedor sintético",
          productName: "Produto sintético",
          presentation: "Caixa",
          quantity: "2.500",
          unitPrice: "10.20",
          lineTotal: "25.50",
        },
      ],
      fairExpenses: [{ competence: "2026-10-01", totalAmount: "100.50" }],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=compras&inicio=2026-10&fim=2026-10",
      ),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('"2,500"');
    expect(csv).toContain('"10,20"');
    expect(csv).toContain('"25,50"');
    expect(csv).toContain('"100,50"');
  });

  it("should_include_annual_targets_for_years_intersecting_monthly_export", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/exportacoes?tipo=metas&inicio=2026-10&fim=2026-10",
      ),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(mocks.listAdmissionTargets).toHaveBeenCalledWith(
      "2026-01-01",
      "2027-01-01",
    );
    expect(csv).toContain('"Anual","2026-01-01","100"');
    expect(csv).toContain('"Mensal","2026-10-01","10"');
    expect(csv).not.toContain("2026-09-01");
    expect(csv).not.toContain("2027-01-01");
  });
});
