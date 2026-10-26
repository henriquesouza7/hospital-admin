import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadAdmissionDashboard: vi.fn(),
  listMonthlyExpenseTotals: vi.fn(),
  loadProductionIndicatorSource: vi.fn(),
  listProductionImports: vi.fn(),
  loadSurgerySummaryForDashboard: vi.fn(),
  logDashboardQueryFailure: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));
vi.mock("@/modules/admin-dashboard/admissions", () => ({
  loadAdmissionDashboard: mocks.loadAdmissionDashboard,
}));
vi.mock("@/modules/finance/indicators/repository", () => ({
  listMonthlyExpenseTotals: mocks.listMonthlyExpenseTotals,
  MonthlyExpenseTotalsQueryError: class extends Error {},
  MonthlyExpenseTotalsRpcUnavailableError: class extends Error {},
}));
vi.mock("@/modules/production/repository", () => ({
  loadProductionIndicatorSource: mocks.loadProductionIndicatorSource,
}));
vi.mock("@/modules/production-import/repository", () => ({
  listProductionImports: mocks.listProductionImports,
}));
vi.mock("@/modules/minor-surgeries/repository", () => ({
  loadSurgerySummaryForDashboard: mocks.loadSurgerySummaryForDashboard,
}));
vi.mock("@/lib/neon/dashboard-diagnostics", () => ({
  logDashboardQueryFailure: mocks.logDashboardQueryFailure,
}));

import Home from "./(admin)/page";
import { KpiCard } from "@/components/kpi-card";

function findElements(
  node: ReactNode,
  predicate: (node: ReactNode) => boolean,
): ReactNode[] {
  const matches = predicate(node) ? [node] : [];
  if (!isValidElement<{ children?: ReactNode }>(node)) return matches;
  return [
    ...matches,
    ...Children.toArray(node.props.children).flatMap((child) =>
      findElements(child, predicate),
    ),
  ];
}

describe("dashboard availability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.loadAdmissionDashboard.mockResolvedValue({ kind: "unavailable" });
    mocks.listMonthlyExpenseTotals.mockResolvedValue([]);
    mocks.loadProductionIndicatorSource.mockResolvedValue({
      categories: [],
      procedures: [],
      entries: [],
    });
    mocks.listProductionImports.mockResolvedValue([]);
    mocks.loadSurgerySummaryForDashboard.mockResolvedValue({
      kind: "unavailable",
      code: null,
    });
  });

  it("should_keep_dashboard_available_when_production_queries_fail", async () => {
    mocks.loadProductionIndicatorSource.mockRejectedValue(
      new Error("Production unavailable"),
    );
    mocks.listProductionImports.mockRejectedValue(
      new Error("Imports unavailable"),
    );

    const page = await Home({
      searchParams: Promise.resolve({ year: "2026", month: "10" }),
    });
    const productionKpi = findElements(
      page,
      (node) =>
        isValidElement<{ label: string }>(node) &&
        node.type === KpiCard &&
        node.props.label === "Séries de produção",
    )[0];
    expect(isValidElement<{ value: string }>(productionKpi)).toBe(true);
    if (!isValidElement<{ value: string }>(productionKpi)) return;
    expect(productionKpi.props.value).toBe("Indisponível");
    expect(mocks.logDashboardQueryFailure).toHaveBeenCalledTimes(2);
    expect(
      mocks.logDashboardQueryFailure.mock.calls.map(
        ([entry]) => entry.operation,
      ),
    ).toEqual(["production_indicators", "production_imports"]);
  });

  it("should_preserve_login_redirect_when_production_session_expires", async () => {
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.loadProductionIndicatorSource.mockRejectedValue(redirectError);

    await expect(
      Home({ searchParams: Promise.resolve({ year: "2026", month: "10" }) }),
    ).rejects.toBe(redirectError);
  });
});
