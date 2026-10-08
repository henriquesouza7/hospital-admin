import { z } from "zod";

const uuidSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(120);
const procedureNameSchema = z.string().trim().min(1).max(160);
const unitSchema = z.string().trim().min(1).max(40);
const sourceSchema = z.string().trim().min(1).max(80);

export const categoryInputSchema = z.object({ name: nameSchema });
export const categoryUpdateSchema = z.object({
  id: uuidSchema,
  name: nameSchema,
});
export const categoryStatusSchema = z.object({
  id: uuidSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const procedureInputSchema = z.object({
  category_id: uuidSchema,
  name: procedureNameSchema,
  counting_unit: unitSchema,
});
export const procedureUpdateSchema = procedureInputSchema.extend({
  id: uuidSchema,
});
export const procedureStatusSchema = categoryStatusSchema;

const competenceSchema = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, "Competência inválida.")
  .transform((value) => `${value}-01`);

const quantitySchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,9})$/, "Informe uma quantidade inteira e não negativa.")
  .refine(
    (value) => Number(value) < 10_000_000_000,
    "Quantidade excede o limite.",
  );

export const productionEntryInputSchema = z.object({
  procedure_id: uuidSchema,
  reference_period: competenceSchema,
  quantity: quantitySchema,
  source: sourceSchema,
});
export const productionEntryUpdateSchema = productionEntryInputSchema.extend({
  id: uuidSchema,
});

export const productionEntryFilterSchema = z.object({
  procedure_id: uuidSchema.optional().or(z.literal("")),
  from: z
    .string()
    .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/)
    .optional()
    .or(z.literal("")),
  to: z
    .string()
    .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/)
    .optional()
    .or(z.literal("")),
});

export const procedureFilterSchema = z.object({
  category_id: uuidSchema.optional().or(z.literal("")),
  status: z.enum(["todos", "ativos", "inativos"]).optional(),
});

export function readFormValue(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

export function parseProductionEntryFilters(params: {
  procedimento?: string | string[];
  de?: string | string[];
  ate?: string | string[];
}) {
  return productionEntryFilterSchema.safeParse({
    procedure_id:
      typeof params.procedimento === "string" ? params.procedimento : "",
    from: typeof params.de === "string" ? params.de : "",
    to: typeof params.ate === "string" ? params.ate : "",
  });
}
