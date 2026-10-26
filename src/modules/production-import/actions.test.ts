import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireProductionAdmin: vi.fn().mockResolvedValue({ id: "admin" }),
  reconcileProductionSusImport: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));
vi.mock("@/modules/production/access", () => ({
  requireProductionAdmin: mocks.requireProductionAdmin,
}));
vi.mock("./repository", () => ({
  reconcileProductionSusImport: mocks.reconcileProductionSusImport,
}));

import { reconcileProductionSusImportAction } from "./actions";

describe("production import actions", () => {
  it("should_preserve_login_redirect_when_reconciliation_session_expires", async () => {
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.reconcileProductionSusImport.mockRejectedValue(redirectError);
    const formData = new FormData();
    for (const [key, value] of Object.entries({
      import_id: "00000000-0000-4000-8000-000000000001",
      procedure_id: "00000000-0000-4000-8000-000000000002",
      source_type: "realizado",
      resolution: "keep_existing",
      expected_entry_id: "00000000-0000-4000-8000-000000000003",
      expected_quantity: "10",
      expected_procedure_id: "00000000-0000-4000-8000-000000000002",
      expected_reference_period: "2026-04-01",
      expected_source: "SUS: realizado",
      expected_counting_unit: "exames",
    })) {
      formData.set(key, value);
    }

    await expect(reconcileProductionSusImportAction(formData)).rejects.toBe(
      redirectError,
    );
  });
});
