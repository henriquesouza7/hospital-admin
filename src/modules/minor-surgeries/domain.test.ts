import { describe, expect, it } from "vitest";
import {
  availableCapacity,
  isActiveAppointment,
  statusLabel,
  summarizeSurgeryDay,
} from "./domain";

describe("minor surgeries domain", () => {
  it("should_count_waiting_and_confirmed_appointments_as_occupied_when_summarizing_day", () => {
    const summary = summarizeSurgeryDay(
      { id: "day", procedure_date: "2026-10-30", capacity: 10 },
      [
        { status: "awaiting_confirmation" },
        { status: "confirmed" },
        { status: "cancelled" },
      ],
    );

    expect(summary).toMatchObject({
      occupied: 2,
      awaitingConfirmation: 1,
      confirmed: 1,
    });
    expect(availableCapacity(summary)).toBe(8);
  });

  it("should_release_capacity_when_appointment_is_cancelled", () => {
    expect(isActiveAppointment("cancelled")).toBe(false);
    expect(isActiveAppointment("confirmed")).toBe(true);
  });

  it("should_label_status_in_portuguese", () => {
    expect(statusLabel("awaiting_confirmation")).toBe("Aguardando confirmação");
  });
});
