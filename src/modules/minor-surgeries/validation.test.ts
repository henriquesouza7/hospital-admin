import { describe, expect, it } from "vitest";
import {
  parseSurgeryAppointmentForm,
  parseSurgeryDayForm,
  parseSurgeryWaitlistForm,
  surgeryAppointmentStatusSchema,
} from "./validation";

const dayId = "f9a52c88-2973-4c38-8542-d7ce03122cc8";
const patientId = "a07dd5df-a160-49f2-a55c-a51274683a02";

describe("minor surgeries validation", () => {
  it("should_use_default_capacity_when_creating_surgery_day_without_capacity", () => {
    const form = new FormData();
    form.set("procedure_date", "2026-10-30");
    expect(parseSurgeryDayForm(form)).toMatchObject({
      success: true,
      data: { capacity: 10 },
    });
  });

  it("should_accept_custom_capacity_and_valid_date_when_creating_surgery_day", () => {
    const form = new FormData();
    form.set("procedure_date", "2026-10-31");
    form.set("capacity", "7");
    expect(parseSurgeryDayForm(form)).toMatchObject({
      success: true,
      data: { capacity: 7 },
    });
  });

  it("should_reject_invalid_date_and_nonpositive_capacity_when_creating_surgery_day", () => {
    const badDate = new FormData();
    badDate.set("procedure_date", "2026-02-30");
    expect(parseSurgeryDayForm(badDate).success).toBe(false);

    const badCapacity = new FormData();
    badCapacity.set("procedure_date", "2026-10-30");
    badCapacity.set("capacity", "0");
    expect(parseSurgeryDayForm(badCapacity).success).toBe(false);
  });

  it("should_require_exactly_one_existing_patient_or_new_name_when_creating_appointment", () => {
    const form = new FormData();
    form.set("surgery_day_id", dayId);
    form.set("patient_id", patientId);
    form.set("patient_name", "");
    form.set("status", "confirmed");
    expect(parseSurgeryAppointmentForm(form).success).toBe(true);

    form.set("patient_id", "");
    form.set("patient_name", "Paciente Teste A");
    expect(parseSurgeryAppointmentForm(form).success).toBe(true);

    form.set("patient_id", patientId);
    expect(parseSurgeryAppointmentForm(form).success).toBe(false);
  });

  it("should_reject_whitespace_only_names_and_invalid_uuids_or_statuses", () => {
    const form = new FormData();
    for (const name of [" ", "\t", "\n", "\r\n\f", " \t \n "]) {
      form.set("patient_name", name);
      expect(parseSurgeryWaitlistForm(form).success).toBe(false);
    }

    form.set("patient_name", "\t Paciente  Teste \n");
    expect(parseSurgeryWaitlistForm(form)).toMatchObject({
      success: true,
      data: { patient_name: "Paciente  Teste" },
    });
    expect(
      surgeryAppointmentStatusSchema.safeParse({
        appointment_id: dayId,
        status: "pending",
      }).success,
    ).toBe(false);
  });

  it("should_reject_cancelled_as_initial_appointment_status", () => {
    const form = new FormData();
    form.set("surgery_day_id", dayId);
    form.set("patient_id", patientId);
    form.set("status", "cancelled");
    expect(parseSurgeryAppointmentForm(form).success).toBe(false);
  });
});
