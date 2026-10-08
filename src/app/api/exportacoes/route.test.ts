import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listAdmissionEntries: vi.fn(),
  listAdmissionTargets: vi.fn(),
  loadIndicatorsSource: vi.fn(),
  listProductionEntries: vi.fn(),
  listUpcomingSurgeryDays: vi.fn(),
  listSurgeryWaitlist: vi.fn(),
  buildIndicatorsData: vi.fn(),
  buildCsv: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/modules/admissions/repository", () => ({
  listAdmissionEntries: mocks.listAdmissionEntries,
  listAdmissionTargets: mocks.listAdmissionTargets,
}));
vi.mock("@/modules/finance/indicators/repository", () => ({
  loadIndicatorsSource: mocks.loadIndicatorsSource,
}));
vi.mock("@/modules/finance/indicators/domain", () => ({
  buildIndicatorsData: mocks.buildIndicatorsData,
}));
vi.mock("@/modules/audit/domain", () => ({
  buildCsv: (rows: readonly (readonly unknown[])[]) =>
    rows
      .map((row) => row.map((value) => JSON.stringify(String(value))).join(","))
      .join("\n"),
}));
vi.mock("@/modules/production/repository", () => ({
  listProductionEntries: mocks.listProductionEntries,
}));
vi.mock("@/modules/minor-surgeries/repository", () => ({
  listUpcomingSurgeryDays: mocks.listUpcomingSurgeryDays,
  listSurgeryWaitlist: mocks.listSurgeryWaitlist,
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
