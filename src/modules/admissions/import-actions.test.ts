import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  importAdmissionEntries: vi.fn(),
  listDoctors: vi.fn(),
  revalidatePath: vi.fn(),
  authCookieSecret: "test-only-secret-with-at-least-thirty-two-characters",
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/neon/env", () => ({
  getNeonServerEnv: () => ({ authCookieSecret: mocks.authCookieSecret }),
}));
vi.mock("./repository", () => ({
  importAdmissionEntries: mocks.importAdmissionEntries,
  listDoctors: mocks.listDoctors,
}));

import { confirmAdmissionCsvAction } from "./import-actions";
import { hashAdmissionCsv, issueAdmissionCsvEvidence } from "./import";

const adminId = "admin-user-id";
const doctorId = "20000000-0000-4000-8000-000000000001";
const csv = "data,medico,quantidade\n2026-10-01,Dra. Teste A,4\n";

describe("admissions CSV import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: adminId });
    mocks.listDoctors.mockResolvedValue([
      { id: doctorId, name: "Dra. Teste A", active: true },
    ]);
    mocks.importAdmissionEntries.mockResolvedValue(1);
  });

  it("should_revalidate_doctor_details_when_csv_import_is_confirmed", async () => {
    const bytes = new TextEncoder().encode(csv);
    const formData = new FormData();
    formData.set("csv", new File([bytes], "internacoes.csv"));
    formData.set(
      "preview_token",
      issueAdmissionCsvEvidence(
        hashAdmissionCsv(bytes),
        adminId,
        mocks.authCookieSecret,
      ),
    );

    const state = await confirmAdmissionCsvAction(
      { status: "idle", message: "" },
      formData,
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/internacoes");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/internacoes/lancamentos",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/internacoes/medicos/[id]",
      "page",
    );
  });
});
