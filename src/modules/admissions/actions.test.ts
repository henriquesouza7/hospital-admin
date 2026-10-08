import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDoctorAction,
  setDoctorActiveAction,
  updateDoctorAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createDoctor: vi.fn(),
  updateDoctor: vi.fn(),
  setDoctorActive: vi.fn(),
  createAdmissionEntry: vi.fn(),
  updateAdmissionEntry: vi.fn(),
  createAdmissionTarget: vi.fn(),
  updateAdmissionTarget: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("./repository", () => ({
  createDoctor: mocks.createDoctor,
  updateDoctor: mocks.updateDoctor,
  setDoctorActive: mocks.setDoctorActive,
  createAdmissionEntry: mocks.createAdmissionEntry,
  updateAdmissionEntry: mocks.updateAdmissionEntry,
  createAdmissionTarget: mocks.createAdmissionTarget,
  updateAdmissionTarget: mocks.updateAdmissionTarget,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("doctor server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-user-id" });
    mocks.createDoctor.mockResolvedValue(undefined);
    mocks.updateDoctor.mockResolvedValue(undefined);
    mocks.setDoctorActive.mockResolvedValue(undefined);
    mocks.createAdmissionEntry.mockResolvedValue(undefined);
    mocks.updateAdmissionEntry.mockResolvedValue(undefined);
    mocks.createAdmissionTarget.mockResolvedValue(undefined);
    mocks.updateAdmissionTarget.mockResolvedValue(undefined);
  });

  it("should_create_trimmed_active_doctor_when_form_is_valid", async () => {
    const state = await createDoctorAction(
      { status: "idle", message: "" },
      form({ name: " Dr. Médico Teste A " }),
    );

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.createDoctor).toHaveBeenCalledWith("Dr. Médico Teste A");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/internacoes");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/internacoes/medicos",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/internacoes/medicos/[id]",
      "page",
    );
    expect(state).toEqual({
      status: "success",
      message: "Médico cadastrado e ativo.",
    });
  });

  it("should_reject_invalid_form_without_calling_repository", async () => {
    const state = await createDoctorAction(
      { status: "idle", message: "" },
      form({ name: "   " }),
    );
    expect(state.status).toBe("error");
    expect(mocks.createDoctor).not.toHaveBeenCalled();
  });

  it("should_require_admin_before_accepting_form_mutations", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      createDoctorAction(
        { status: "idle", message: "" },
        form({ name: "Dr. Médico Teste A" }),
      ),
    ).rejects.toThrow("Unauthorized");
    expect(mocks.createDoctor).not.toHaveBeenCalled();
  });

  it("should_update_name_when_doctor_id_and_name_are_valid", async () => {
    await updateDoctorAction(
      { status: "idle", message: "" },
      form({
        id: "20000000-0000-4000-8000-000000000001",
        name: " Dra. Teste ",
      }),
    );
    expect(mocks.updateDoctor).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000001",
      "Dra. Teste",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/internacoes");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/internacoes/medicos",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/internacoes/medicos/[id]",
      "page",
    );
  });

  it("should_set_doctor_active_state_from_validated_form", async () => {
    const state = await setDoctorActiveAction(
      { status: "idle", message: "" },
      form({ id: "20000000-0000-4000-8000-000000000001", active: "false" }),
    );
    expect(mocks.setDoctorActive).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000001",
      false,
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/internacoes");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/internacoes/medicos",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/internacoes/medicos/[id]",
      "page",
    );
    expect(state.message).toBe("Médico inativado.");
  });

  it("should_show_server_errors_without_exposing_database_details", async () => {
    mocks.createDoctor.mockRejectedValue(new Error("secret database detail"));
    const state = await createDoctorAction(
      { status: "idle", message: "" },
      form({ name: "Dr. Médico Teste A" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "Não foi possível cadastrar o médico. Tente novamente.",
    });
  });

  it("should_create_admission_entry_when_date_doctor_and_quantity_are_valid", async () => {
    const { createAdmissionEntryAction } = await import("./actions");
    const state = await createAdmissionEntryAction(
      { status: "idle", message: "" },
      form({
        doctor_id: "20000000-0000-4000-8000-000000000001",
        entry_date: "2026-10-07",
        quantity: "4",
      }),
    );
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.createAdmissionEntry).toHaveBeenCalledWith({
      doctorId: "20000000-0000-4000-8000-000000000001",
      entryDate: "2026-10-07",
      quantity: 4,
    });
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
    expect(state.status).toBe("success");
  });

  it("should_reject_negative_entry_quantity_without_repository_mutation", async () => {
    const { createAdmissionEntryAction } = await import("./actions");
    const state = await createAdmissionEntryAction(
      { status: "idle", message: "" },
      form({
        doctor_id: "20000000-0000-4000-8000-000000000001",
        entry_date: "2026-10-07",
        quantity: "-1",
      }),
    );
    expect(state.status).toBe("error");
    expect(mocks.createAdmissionEntry).not.toHaveBeenCalled();
  });

  it("should_update_admission_entry_quantity_through_repository", async () => {
    const { updateAdmissionEntryAction } = await import("./actions");
    const state = await updateAdmissionEntryAction(
      { status: "idle", message: "" },
      form({ id: "20000000-0000-4000-8000-000000000002", quantity: "0" }),
    );
    expect(mocks.updateAdmissionEntry).toHaveBeenCalledWith({
      id: "20000000-0000-4000-8000-000000000002",
      quantity: 0,
    });
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
    expect(state.status).toBe("success");
  });

  it("should_create_hospital_month_target_from_valid_competence", async () => {
    const { createAdmissionTargetAction } = await import("./actions");
    const state = await createAdmissionTargetAction(
      { status: "idle", message: "" },
      form({ period_type: "month", period: "2026-10", target_quantity: "32" }),
    );
    expect(mocks.createAdmissionTarget).toHaveBeenCalledWith({
      periodType: "month",
      referencePeriod: "2026-10-01",
      quantity: 32,
    });
    expect(state.status).toBe("success");
  });

  it("should_update_hospital_target_without_changing_its_period", async () => {
    const { updateAdmissionTargetAction } = await import("./actions");
    await updateAdmissionTargetAction(
      { status: "idle", message: "" },
      form({
        id: "20000000-0000-4000-8000-000000000003",
        target_quantity: "90",
      }),
    );
    expect(mocks.updateAdmissionTarget).toHaveBeenCalledWith({
      id: "20000000-0000-4000-8000-000000000003",
      quantity: 90,
    });
  });
});
