import { z } from "zod";

const doctorIdSchema = z.string().uuid();

export const doctorNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do médico.")
  .max(160, "O nome deve ter até 160 caracteres.");

export const doctorUpdateSchema = z.object({
  id: doctorIdSchema,
  name: doctorNameSchema,
});

export const doctorStatusSchema = z.object({
  id: doctorIdSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export function parseDoctorNameForm(formData: FormData) {
  return doctorNameSchema.safeParse(formData.get("name"));
}

export function parseDoctorUpdateForm(formData: FormData) {
  return doctorUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
}

export function parseDoctorStatusForm(formData: FormData) {
  return doctorStatusSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
}

const admissionQuantitySchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, "Informe uma quantidade inteira não negativa.")
  .transform(Number)
  .refine(Number.isSafeInteger, "Informe uma quantidade inteira válida.")
  .refine(
    (value) => value <= 2_147_483_647,
    "A quantidade excede o limite permitido.",
  );

export const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => value >= "1900-01-01" && value <= "2100-12-31",
    "A data deve estar entre 01/01/1900 e 31/12/2100.",
  )
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Informe uma data válida.");

export const entryCreateSchema = z.object({
  doctor_id: doctorIdSchema,
  entry_date: entryDateSchema,
  quantity: admissionQuantitySchema,
});
export const entryUpdateSchema = z.object({
  id: doctorIdSchema,
  quantity: admissionQuantitySchema,
});
export const targetCreateSchema = z
  .object({
    period_type: z.enum(["month", "year"]),
    period: z.string(),
    target_quantity: admissionQuantitySchema,
  })
  .transform((value, context) => {
    const isPeriodFormatValid =
      value.period_type === "year"
        ? /^\d{4}$/.test(value.period)
        : /^\d{4}-(0[1-9]|1[0-2])$/.test(value.period);
    const year = Number(value.period.slice(0, 4));
    const isYearValid = year >= 1900 && year <= 2100;
    if (!isYearValid || !isPeriodFormatValid) {
      context.addIssue({
        code: "custom",
        message: "Informe uma competência válida.",
      });
      return z.NEVER;
    }
    return {
      period_type: value.period_type,
      reference_period:
        value.period_type === "month"
          ? `${value.period}-01`
          : `${value.period}-01-01`,
      target_quantity: value.target_quantity,
    };
  });
export const targetUpdateSchema = z.object({
  id: doctorIdSchema,
  target_quantity: admissionQuantitySchema,
});

export function parseEntryCreateForm(formData: FormData) {
  return entryCreateSchema.safeParse({
    doctor_id: formData.get("doctor_id"),
    entry_date: formData.get("entry_date"),
    quantity: formData.get("quantity"),
  });
}
export function parseEntryUpdateForm(formData: FormData) {
  return entryUpdateSchema.safeParse({
    id: formData.get("id"),
    quantity: formData.get("quantity"),
  });
}
export function parseTargetCreateForm(formData: FormData) {
  return targetCreateSchema.safeParse({
    period_type: formData.get("period_type"),
    period: formData.get("period"),
    target_quantity: formData.get("target_quantity"),
  });
}
export function parseTargetUpdateForm(formData: FormData) {
  return targetUpdateSchema.safeParse({
    id: formData.get("id"),
    target_quantity: formData.get("target_quantity"),
  });
}
