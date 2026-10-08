import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createSurgeryDay: vi.fn(),
  updateSurgeryDayCapacity: vi.fn(),
  createSurgeryAppointment: vi.fn(),
  updateSurgeryAppointmentStatus: vi.fn(),
  createSurgeryWaitlistEntry: vi.fn(),
  searchSurgeryPatients: vi.fn(),
  transferSurgeryWaitlistEntry: vi.fn(),
  updateSurgeryPatient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));
vi.mock("./repository", () => ({
  createSurgeryDay: mocks.createSurgeryDay,
  updateSurgeryDayCapacity: mocks.updateSurgeryDayCapacity,
  createSurgeryAppointment: mocks.createSurgeryAppointment,
  updateSurgeryAppointmentStatus: mocks.updateSurgeryAppointmentStatus,
  createSurgeryWaitlistEntry: mocks.createSurgeryWaitlistEntry,
  searchSurgeryPatients: mocks.searchSurgeryPatients,
  transferSurgeryWaitlistEntry: mocks.transferSurgeryWaitlistEntry,
  updateSurgeryPatient: mocks.updateSurgeryPatient,
}));

import {
  createSurgeryDayAction,
  initialMinorSurgeryActionState,
  searchSurgeryPatientsAction,
  updateSurgeryDayCapacityAction,
} from "./actions";

describe("minor surgeries actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSurgeryDayCapacity.mockResolvedValue(undefined);
  });

  it("should_revalidate_dynamic_surgery_day_page_after_capacity_update", async () => {
    const formData = new FormData();
    formData.set("surgery_day_id", "f9a52c88-2973-4c38-8542-d7ce03122cc8");
    formData.set("capacity", "8");

    const result = await updateSurgeryDayCapacityAction(
      initialMinorSurgeryActionState,
      formData,
    );

    expect(result.status).toBe("success");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/pequenas-cirurgias/dias/[id]",
      "page",
    );
  });

  it("should_propagate_redirects_when_mutations_encounter_auth_redirect", async () => {
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    const formData = new FormData();
    formData.set("procedure_date", "2026-10-30");

    mocks.createSurgeryDay.mockRejectedValue(redirectError);

    await expect(
      createSurgeryDayAction(initialMinorSurgeryActionState, formData),
    ).rejects.toBe(redirectError);
  });

  it("should_return_only_the_bounded_patient_search_result", async () => {
    const patients = [
      {
        id: "f9a52c88-2973-4c38-8542-d7ce03122cc8",
        name: "Pessoa sintética",
      },
    ];
    mocks.searchSurgeryPatients.mockResolvedValue({
      patients,
      offset: 0,
      hasMore: true,
    });

    await expect(searchSurgeryPatientsAction("Pessoa", 0)).resolves.toEqual({
      ok: true,
      patients,
      hasMore: true,
    });
    expect(mocks.searchSurgeryPatients).toHaveBeenCalledWith("Pessoa", 0);
  });
});
