import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createSurgeryDay: vi.fn(),
  updateSurgeryDayCapacity: vi.fn(),
  createSurgeryAppointment: vi.fn(),
  updateSurgeryAppointmentStatus: vi.fn(),
  createSurgeryWaitlistEntry: vi.fn(),
  transferSurgeryWaitlistEntry: vi.fn(),
  updateSurgeryPatient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./repository", () => ({
  createSurgeryDay: mocks.createSurgeryDay,
  updateSurgeryDayCapacity: mocks.updateSurgeryDayCapacity,
  createSurgeryAppointment: mocks.createSurgeryAppointment,
  updateSurgeryAppointmentStatus: mocks.updateSurgeryAppointmentStatus,
  createSurgeryWaitlistEntry: mocks.createSurgeryWaitlistEntry,
  transferSurgeryWaitlistEntry: mocks.transferSurgeryWaitlistEntry,
  updateSurgeryPatient: mocks.updateSurgeryPatient,
}));

import {
  initialMinorSurgeryActionState,
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
});
