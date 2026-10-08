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

import {
  confirmAdmissionCsvAction,
  previewAdmissionCsvAction,
} from "./import-actions";
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

  it("should_not_sign_or_confirm_a_preview_with_invalid_rows", async () => {
    const invalidCsv =
      "data,medico,quantidade\n2026-10-01,Médico inexistente,4\n";
    const previewForm = new FormData();
    previewForm.set(
      "csv",
      new File([invalidCsv], "internacoes.csv", { type: "text/csv" }),
    );

    const preview = await previewAdmissionCsvAction(
      { status: "idle", message: "" },
      previewForm,
    );

    expect(preview).toMatchObject({ status: "success", token: "" });
    if (preview.status !== "success") throw new Error("Preview failed.");
    expect(preview.rows[0]?.error).toContain("não encontrado");

    const confirmationForm = new FormData();
    confirmationForm.set(
      "csv",
      new File([invalidCsv], "internacoes.csv", { type: "text/csv" }),
    );
    confirmationForm.set("preview_token", preview.token);
    const confirmation = await confirmAdmissionCsvAction(
      { status: "idle", message: "" },
      confirmationForm,
    );

    expect(confirmation.status).toBe("error");
    expect(mocks.importAdmissionEntries).not.toHaveBeenCalled();
  });
});
