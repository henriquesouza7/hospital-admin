import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAdmissionDashboard } from "./admissions";

const mocks = vi.hoisted(() => ({
  getAdmissionDashboardTotals: vi.fn(),
  listAdmissionTargets: vi.fn(),
}));

vi.mock("../admissions/repository", () => mocks);
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));

describe("admin dashboard admissions loader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdmissionDashboardTotals.mockResolvedValue({
      monthlyTotals: [{ month: 10, quantity: 12 }],
      annualTotal: 12,
      byDoctor: [],
    });
    mocks.listAdmissionTargets.mockResolvedValue([]);
  });

  it("should_mark_admissions_unavailable_when_the_dashboard_rpc_fails", async () => {
    mocks.getAdmissionDashboardTotals.mockRejectedValue(new Error("42501"));

    await expect(
      loadAdmissionDashboard({
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        year: 2026,
        month: 10,
        today: new Date("2026-10-14T12:00:00Z"),
      }),
    ).resolves.toEqual({ kind: "unavailable" });
  });

  it("should_preserve_admission_totals_when_queries_succeed", async () => {
    await expect(
      loadAdmissionDashboard({
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        year: 2026,
        month: 10,
        today: new Date("2026-10-14T12:00:00Z"),
      }),
    ).resolves.toMatchObject({
      kind: "available",
      dashboard: { monthlyTotal: 12, annualTotal: 12 },
    });
  });

  it("should_preserve_login_redirect_when_admissions_session_expires", async () => {
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.getAdmissionDashboardTotals.mockRejectedValue(redirectError);

    await expect(
      loadAdmissionDashboard({
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        year: 2026,
        month: 10,
        today: new Date("2026-10-14T12:00:00Z"),
      }),
    ).rejects.toBe(redirectError);
  });
});
