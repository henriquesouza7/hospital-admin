import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireProductionAdmin } from "@/modules/production/access";
import type { ProductionImportRow } from "./domain";

const PAGE_SIZE = 1000;

const importSchema = z.object({
  id: z.string().uuid(),
  file_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  reference_period: z.iso.date(),
  row_count: z.number().int().nonnegative(),
  imported_group_count: z.number().int().nonnegative(),
  pending_group_count: z.number().int().nonnegative(),
  status: z.enum(["confirmed", "pending_reconciliation", "reconciled"]),
  actor_id: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

const importRowSchema = z.object({
  id: z.string().uuid(),
  import_id: z.string().uuid(),
  source_row_number: z.number().int(),
  external_code: z.string().nullable(),
  procedure_name_snapshot: z.string(),
  source_type: z.enum(["apresentado", "aprovado", "realizado"]),
  quantity: z.union([z.string(), z.number()]).transform(String),
  procedure_id: z.string().uuid(),
  production_entry_id: z.string().uuid().nullable(),
  imported_counting_unit_snapshot: z.string().nullable(),
  existing_counting_unit_snapshot: z.string().nullable(),
  existing_quantity_snapshot: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((value) => (value === null ? null : String(value))),
  status: z.enum([
    "pending",
    "imported",
    "pending_reconciliation",
    "kept_existing",
    "replaced_existing",
  ]),
});
const currentProductionEntrySchema = z.object({
  id: z.string().uuid(),
  procedure_id: z.string().uuid(),
  reference_period: z.iso.date(),
  quantity: z.union([z.string(), z.number()]).transform(String),
  source: z.string(),
  counting_unit: z.string(),
});

function requireData<T>(
  data: unknown,
  error: unknown,
  message: string,
  schema: z.ZodType<T>,
): T {
  if (error || data === null || data === undefined) throw new Error(message);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

export async function listProductionImports() {
  await requireProductionAdmin();
  const rows: z.infer<typeof importSchema>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await getNeonDataApiClient()
      .from("production_imports")
      .select(
        "id,file_sha256,reference_period,row_count,imported_group_count,pending_group_count,status,actor_id,created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    const page = requireData(
      data,
      error,
      "Não foi possível carregar as importações.",
      z.array(importSchema),
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function listPendingProductionImportRows() {
  await requireProductionAdmin();
  const rows: z.infer<typeof importRowSchema>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await getNeonDataApiClient()
      .from("production_import_rows")
      .select(
        "id,import_id,source_row_number,external_code,procedure_name_snapshot,source_type,quantity,procedure_id,production_entry_id,imported_counting_unit_snapshot,existing_counting_unit_snapshot,existing_quantity_snapshot,status",
      )
      .eq("status", "pending_reconciliation")
      .order("import_id", { ascending: true })
      .order("procedure_id", { ascending: true })
      .order("source_type", { ascending: true })
      .order("source_row_number", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const page = requireData(
      data,
      error,
      "Não foi possível carregar as pendências de reconciliação.",
      z.array(importRowSchema),
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  const entryIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.production_entry_id ? [row.production_entry_id] : [],
      ),
    ),
  ];
  const currentEntries: z.infer<typeof currentProductionEntrySchema>[] = [];
  for (let offset = 0; offset < entryIds.length; offset += PAGE_SIZE) {
    const ids = entryIds.slice(offset, offset + PAGE_SIZE);
    const { data, error } = await getNeonDataApiClient()
      .from("production_entries")
      .select("id,procedure_id,reference_period,quantity,source,counting_unit")
      .in("id", ids);
    currentEntries.push(
      ...requireData(
        data,
        error,
        "Não foi possível carregar os lançamentos atuais das pendências.",
        z.array(currentProductionEntrySchema),
      ),
    );
  }
  const currentEntryById = new Map(
    currentEntries.map((entry) => [entry.id, entry]),
  );
  return rows.map((row) => ({
    ...row,
    current_entry: row.production_entry_id
      ? (currentEntryById.get(row.production_entry_id) ?? null)
      : null,
  }));
}

export async function confirmProductionSusImport(input: {
  fileSha256: string;
  referencePeriod: string;
  rows: readonly ProductionImportRow[];
}) {
  await requireProductionAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "confirm_production_sus_import",
    {
      p_file_sha256: input.fileSha256,
      p_reference_period: input.referencePeriod,
      p_rows: input.rows,
    },
  );
  if (error) {
    if (error.code === "23505")
      throw new Error("Este arquivo já foi importado.");
    throw new Error("Não foi possível confirmar a importação.");
  }
  const result = z
    .object({
      import_id: z.string().uuid(),
      row_count: z.number().int().positive(),
      imported_group_count: z.number().int().nonnegative(),
      pending_group_count: z.number().int().nonnegative(),
    })
    .safeParse(data);
  if (!result.success)
    throw new Error("A confirmação não retornou um resultado válido.");
  return result.data;
}

export async function reconcileProductionSusImport(input: {
  import_id: string;
  procedure_id: string;
  source_type: "apresentado" | "aprovado" | "realizado";
  resolution: "keep_existing" | "replace_with_import";
  expected_entry_id: string;
  expected_quantity: number;
  expected_procedure_id: string;
  expected_reference_period: string;
  expected_source: string;
  expected_counting_unit: string;
}) {
  await requireProductionAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "reconcile_production_sus_import",
    {
      p_import_id: input.import_id,
      p_procedure_id: input.procedure_id,
      p_source_type: input.source_type,
      p_resolution: input.resolution,
      p_expected_entry_id: input.expected_entry_id,
      p_expected_quantity: input.expected_quantity,
      p_expected_procedure_id: input.expected_procedure_id,
      p_expected_reference_period: input.expected_reference_period,
      p_expected_source: input.expected_source,
      p_expected_counting_unit: input.expected_counting_unit,
    },
  );
  if (error?.code === "40001") {
    throw new Error(
      "O lançamento mudou depois de ser exibido. Recarregue a página e confira o estado atual antes de decidir a reconciliação.",
    );
  }
  if (error?.code === "23514") {
    throw new Error(
      "A unidade do procedimento mudou desde a importação. Preserve o lançamento existente e importe o relatório novamente.",
    );
  }
  if (error || data !== true)
    throw new Error("Não foi possível concluir a reconciliação.");
}

export type PendingProductionImportRow = Awaited<
  ReturnType<typeof listPendingProductionImportRows>
>[number];
