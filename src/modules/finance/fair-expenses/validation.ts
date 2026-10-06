import { z } from "zod";

const monthPattern = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const amountPattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;
const uuidSchema = z.string().uuid();

function amountToCents(value: string): bigint {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

function centsToDecimal(value: bigint): string {
  return `${value / BigInt(100)}.${(value % BigInt(100))
    .toString()
    .padStart(2, "0")}`;
}

const competenceSchema = z
  .string()
  .regex(monthPattern, "Informe uma competência válida.")
  .transform((month) => `${month}-01`);

const totalAmountSchema = z
  .string()
  .trim()
  .regex(amountPattern, "Informe um total válido, com até duas casas decimais.")
  .refine(
    (value) => amountToCents(value) <= BigInt("999999999999"),
    "O total excede o limite permitido.",
  )
  .transform((value) => centsToDecimal(amountToCents(value)));

const notesSchema = z
  .string()
  .trim()
  .max(1000, "A observação deve ter até 1.000 caracteres.")
  .transform((value) => value || null);

export const fairExpenseInputSchema = z.object({
  competence: competenceSchema,
  total_amount: totalAmountSchema,
  notes: notesSchema,
});

export const fairExpenseUpdateSchema = z.object({
  id: uuidSchema,
  total_amount: totalAmountSchema,
  notes: notesSchema,
});

export function parseFairExpenseForm(formData: FormData) {
  return fairExpenseInputSchema.safeParse({
    competence: formData.get("competence"),
    total_amount: formData.get("total_amount"),
    notes: formData.get("notes") ?? "",
  });
}

export function parseFairExpenseUpdateForm(formData: FormData) {
  return fairExpenseUpdateSchema.safeParse({
    id: formData.get("id"),
    total_amount: formData.get("total_amount"),
    notes: formData.get("notes") ?? "",
  });
}
