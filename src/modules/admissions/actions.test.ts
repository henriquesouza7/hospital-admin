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
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("./repository", () => ({
  createDoctor: mocks.createDoctor,
  updateDoctor: mocks.updateDoctor,
  setDoctorActive: mocks.setDoctorActive,
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
  });

  it("should_create_trimmed_active_doctor_when_form_is_valid", async () => {
    const state = await createDoctorAction(
      { status: "idle", message: "" },
      form({ name: " Dr. Médico Teste A " }),
    );

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.createDoctor).toHaveBeenCalledWith("Dr. Médico Teste A");
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
});
