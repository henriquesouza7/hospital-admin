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
