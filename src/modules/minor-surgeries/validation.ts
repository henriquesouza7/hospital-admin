import { z } from "zod";
import { surgeryAppointmentStatuses } from "./domain";

const uuidSchema = z.string().uuid();

export const surgeryDayIdSchema = uuidSchema;

export const patientNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome.")
  .max(160, "O nome deve ter até 160 caracteres.");

export const surgeryDayInputSchema = z.object({
  procedure_date: z.iso.date("Informe uma data válida."),
  capacity: z.coerce.number().int().positive().default(10),
});

export const surgeryDayCapacitySchema = z.object({
  surgery_day_id: uuidSchema,
  capacity: z.coerce.number().int().positive(),
});

const patientSelectionSchema = z
  .object({
    patient_id: z
      .union([uuidSchema, z.literal("")])
      .transform((value) => value || null),
    patient_name: z.string().trim().max(160),
  })
  .refine(
    ({ patient_id, patient_name }) =>
      Boolean(patient_id) !== Boolean(patient_name),
    "Selecione uma pessoa cadastrada ou informe um novo nome.",
  );

export const surgeryAppointmentInputSchema = patientSelectionSchema.extend({
  surgery_day_id: uuidSchema,
  status: z
    .enum(surgeryAppointmentStatuses)
    .refine((status) => status !== "cancelled"),
});

export const surgeryAppointmentStatusSchema = z.object({
  appointment_id: uuidSchema,
  status: z.enum(surgeryAppointmentStatuses),
});

export const surgeryWaitlistInputSchema = patientSelectionSchema;

export const surgeryWaitlistTransferSchema = z.object({
  waitlist_id: uuidSchema,
  surgery_day_id: uuidSchema,
});

export const surgeryPatientUpdateSchema = z.object({
  patient_id: uuidSchema,
  name: patientNameSchema,
});

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function parseSurgeryDayForm(formData: FormData) {
  const rawCapacity = formString(formData, "capacity");
  return surgeryDayInputSchema.safeParse({
    procedure_date: formString(formData, "procedure_date"),
    capacity: rawCapacity === "" ? 10 : rawCapacity,
  });
}

export function parseSurgeryDayCapacityForm(formData: FormData) {
  return surgeryDayCapacitySchema.safeParse({
    surgery_day_id: formString(formData, "surgery_day_id"),
    capacity: formString(formData, "capacity"),
  });
}

export function parseSurgeryAppointmentForm(formData: FormData) {
  return surgeryAppointmentInputSchema.safeParse({
    surgery_day_id: formString(formData, "surgery_day_id"),
    patient_id: formString(formData, "patient_id"),
    patient_name: formString(formData, "patient_name"),
    status: formString(formData, "status"),
  });
}

export function parseSurgeryAppointmentStatusForm(formData: FormData) {
  return surgeryAppointmentStatusSchema.safeParse({
    appointment_id: formString(formData, "appointment_id"),
    status: formString(formData, "status"),
  });
}

export function parseSurgeryWaitlistForm(formData: FormData) {
  return surgeryWaitlistInputSchema.safeParse({
    patient_id: formString(formData, "patient_id"),
    patient_name: formString(formData, "patient_name"),
  });
}

export function parseSurgeryWaitlistTransferForm(formData: FormData) {
  return surgeryWaitlistTransferSchema.safeParse({
    waitlist_id: formString(formData, "waitlist_id"),
    surgery_day_id: formString(formData, "surgery_day_id"),
  });
}

export function parseSurgeryPatientUpdateForm(formData: FormData) {
  return surgeryPatientUpdateSchema.safeParse({
    patient_id: formString(formData, "patient_id"),
    name: formString(formData, "name"),
  });
}
