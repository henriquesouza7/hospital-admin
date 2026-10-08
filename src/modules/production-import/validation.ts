import { z } from "zod";
import { productionCsvColumnsSchema } from "./domain";

const mappingKeySchema = z.string().min(2).max(400);
const procedureIdSchema = z.string().uuid();

export const productionCsvRequestSchema = z.object({
  referencePeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  delimiter: z.enum([",", ";"]),
  columns: productionCsvColumnsSchema,
});

export const productionImportConfirmationSchema = z.object({
  referencePeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  delimiter: z.enum([",", ";"]),
  columns: productionCsvColumnsSchema,
  previewToken: z.string().min(1).max(2048),
  mappings: z
    .record(mappingKeySchema, procedureIdSchema)
    .refine(
      (value) =>
        Object.keys(value).length >= 1 && Object.keys(value).length <= 500,
    ),
});

export const productionImportReconciliationSchema = z.object({
  import_id: z.string().uuid(),
  procedure_id: z.string().uuid(),
  source_type: z.enum(["apresentado", "aprovado", "realizado"]),
  resolution: z.enum(["keep_existing", "replace_with_import"]),
  expected_entry_id: z.string().uuid(),
  expected_quantity: z
    .string()
    .regex(/^\d{1,10}$/)
    .refine((value) => Number(value) < 10_000_000_000)
    .transform(Number),
  expected_procedure_id: z.string().uuid(),
  expected_reference_period: z.iso.date(),
  expected_source: z.string().min(1).max(80),
  expected_counting_unit: z.string().min(1).max(80),
});

export function parseProductionImportPeriod(value: string): string {
  const parsed =
    productionCsvRequestSchema.shape.referencePeriod.safeParse(value);
  if (!parsed.success)
    throw new Error("Informe uma competência mensal válida.");
  return `${parsed.data}-01`;
}

export function readProductionCsvColumns(value: string) {
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new Error("Selecione as colunas do arquivo novamente.");
  }
  const parsed = productionCsvRequestSchema.shape.columns.safeParse(json);
  if (!parsed.success)
    throw new Error("Selecione as colunas do arquivo novamente.");
  return parsed.data;
}
