export const surgeryAppointmentStatuses = [
  "awaiting_confirmation",
  "confirmed",
  "cancelled",
] as const;

export type SurgeryAppointmentStatus =
  (typeof surgeryAppointmentStatuses)[number];

export type SurgeryDaySummary = Readonly<{
  id: string;
  procedure_date: string;
  capacity: number;
  occupied: number;
  awaitingConfirmation: number;
  confirmed: number;
}>;

export type SurgeryPatient = Readonly<{ id: string; name: string }>;

export type SurgeryAppointment = Readonly<{
  id: string;
  surgery_day_id: string;
  patient_id: string;
  source_waitlist_id: string | null;
  status: SurgeryAppointmentStatus;
  created_at: string;
  updated_at: string;
  patient: SurgeryPatient;
}>;

export type SurgeryWaitlistEntry = Readonly<{
  id: string;
  patient_id: string;
  status: "waiting" | "transferred";
  transferred_at: string | null;
  created_at: string;
  patient: SurgeryPatient;
}>;

export function isActiveAppointment(status: SurgeryAppointmentStatus) {
  return status !== "cancelled";
}

export function summarizeSurgeryDay(
  day: Pick<SurgeryDaySummary, "id" | "procedure_date" | "capacity">,
  appointments: readonly Pick<SurgeryAppointment, "status">[],
): SurgeryDaySummary {
  const awaitingConfirmation = appointments.filter(
    (appointment) => appointment.status === "awaiting_confirmation",
  ).length;
  const confirmed = appointments.filter(
    (appointment) => appointment.status === "confirmed",
  ).length;
  const occupied = awaitingConfirmation + confirmed;

  return {
    ...day,
    occupied,
    awaitingConfirmation,
    confirmed,
  };
}

export function availableCapacity(day: SurgeryDaySummary) {
  return Math.max(0, day.capacity - day.occupied);
}

export function statusLabel(status: SurgeryAppointmentStatus) {
  switch (status) {
    case "awaiting_confirmation":
      return "Aguardando confirmação";
    case "confirmed":
      return "Confirmado";
    case "cancelled":
      return "Cancelado";
  }
}
