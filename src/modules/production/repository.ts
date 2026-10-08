import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireProductionAdmin } from "./access";
import type {
  ProcedureCategory,
  ProductionEntry,
  ProductionProcedure,
} from "./domain";

const categoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  active: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
const procedureRowSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string(),
  counting_unit: z.string(),
  active: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
const entryRowSchema = z.object({
  id: z.string().uuid(),
  procedure_id: z.string().uuid(),
  counting_unit: z.string(),
  reference_period: z.iso.date(),
  quantity: z.union([z.string(), z.number()]).transform(String),
  source: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

const uuidResultSchema = z.string().uuid();
const PAGE_SIZE = 1000;

export type ProductionIndicatorEntry = ProductionEntry &
  Readonly<{ category_id: string }>;

export type ProductionIndicatorSource = Readonly<{
  categories: readonly ProcedureCategory[];
  procedures: readonly ProductionProcedure[];
  entries: readonly ProductionIndicatorEntry[];
}>;

export class DuplicateProductionRecordError extends Error {
  constructor(
    message = "Já existe um registro com os mesmos dados de origem.",
  ) {
    super(message);
    this.name = "DuplicateProductionRecordError";
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function requireData<T>(
  data: unknown,
  error: unknown,
  message: string,
  schema: z.ZodType<T>,
): T {
  if (error || data === null || data === undefined) {
    throw new Error(message);
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(message);
  return result.data;
}

async function callUuidRpc(name: string, parameters: Record<string, unknown>) {
  const { data, error } = await getNeonDataApiClient().rpc(name, parameters);
  if (error) {
    if (errorCode(error) === "23505") {
      throw new DuplicateProductionRecordError(
        "Já existe um cadastro equivalente.",
      );
    }
    throw new Error("Não foi possível salvar os dados de Produção.");
  }
  if (!uuidResultSchema.safeParse(data).success) {
    throw new Error("Não foi possível confirmar o cadastro de Produção.");
  }
}

async function callBooleanRpc(
  name: string,
  parameters: Record<string, unknown>,
) {
  const { data, error } = await getNeonDataApiClient().rpc(name, parameters);
  if (error) {
    if (errorCode(error) === "23505") {
      throw new DuplicateProductionRecordError(
        "Já existe um cadastro equivalente.",
      );
    }
    if (errorCode(error) === "23514") {
      throw new Error(
        "Inative os procedimentos ativos antes de inativar esta categoria.",
      );
    }
    throw new Error("Não foi possível atualizar os dados de Produção.");
  }
  if (data !== true) throw new Error("Não foi possível confirmar a alteração.");
}

export async function listProcedureCategories(): Promise<ProcedureCategory[]> {
  await requireProductionAdmin();
  return listProcedureCategoryRows();
}

async function listProcedureCategoryRows() {
  const rows: z.infer<typeof categoryRowSchema>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await getNeonDataApiClient()
      .from("procedure_categories")
      .select("id,name,active,created_at,updated_at")
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const page = requireData(
      data,
      error,
      "Não foi possível carregar as categorias.",
      z.array(categoryRowSchema),
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function listProductionProcedures(
  filters: {
    category_id?: string;
    status?: "todos" | "ativos" | "inativos";
  } = {},
): Promise<ProductionProcedure[]> {
  await requireProductionAdmin();
  const [rows, categories] = await Promise.all([
    listProductionProcedureRows(filters),
    listProcedureCategories(),
  ]);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  return rows.map((procedure) => ({
    ...procedure,
    category_name:
      categoryNames.get(procedure.category_id) ?? "Categoria indisponível",
  }));
}

async function listProductionProcedureRows(filters: {
  category_id?: string;
  status?: "todos" | "ativos" | "inativos";
}) {
  const rows: z.infer<typeof procedureRowSchema>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = getNeonDataApiClient()
      .from("procedures")
      .select("id,category_id,name,counting_unit,active,created_at,updated_at");
    if (filters.category_id)
      query = query.eq("category_id", filters.category_id);
    if (filters.status === "ativos") query = query.eq("active", true);
    if (filters.status === "inativos") query = query.eq("active", false);
    const { data, error } = await query
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const page = requireData(
      data,
      error,
      "Não foi possível carregar os procedimentos.",
      z.array(procedureRowSchema),
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function listProductionEntries(
  filters: {
    procedure_id?: string;
    from?: string;
    to?: string;
    maxRows?: number;
  } = {},
): Promise<ProductionEntry[]> {
  await requireProductionAdmin();
  const [rows, procedures, categories] = await Promise.all([
    listProductionEntryRows(filters),
    listProductionProcedures(),
    listProcedureCategories(),
  ]);
  const procedureById = new Map(
    procedures.map((procedure) => [procedure.id, procedure]),
  );
  const categoryById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  return rows.map((entry) => {
    const procedure = procedureById.get(entry.procedure_id);
    return {
      ...entry,
      procedure_name: procedure?.name ?? "Procedimento inativo",
      counting_unit: entry.counting_unit,
      category_name: procedure
        ? (categoryById.get(procedure.category_id) ?? "Categoria indisponível")
        : "Categoria indisponível",
    };
  });
}

async function listProductionEntryRows(filters: {
  procedure_id?: string;
  from?: string;
  to?: string;
  maxRows?: number;
}) {
  const rows: z.infer<typeof entryRowSchema>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = getNeonDataApiClient()
      .from("production_entries")
      .select(
        "id,procedure_id,counting_unit,reference_period,quantity,source,created_at,updated_at",
      );
    if (filters.procedure_id)
      query = query.eq("procedure_id", filters.procedure_id);
    if (filters.from)
      query = query.gte("reference_period", `${filters.from}-01`);
    if (filters.to) query = query.lte("reference_period", `${filters.to}-01`);
    const pageSize =
      filters.maxRows === undefined
        ? PAGE_SIZE
        : Math.min(PAGE_SIZE, filters.maxRows + 1 - rows.length);
    const { data, error } = await query
      .order("reference_period", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    const page = requireData(
      data,
      error,
      "Não foi possível carregar os lançamentos.",
      z.array(entryRowSchema),
    );
    rows.push(...page);
    if (
      (filters.maxRows !== undefined && rows.length > filters.maxRows) ||
      page.length < pageSize
    )
      return rows;
  }
}

export async function loadProductionIndicatorSource(): Promise<ProductionIndicatorSource> {
  await requireProductionAdmin();
  const [categoryRows, procedureRows, entryRows] = await Promise.all([
    listProcedureCategoryRows(),
    listProductionProcedureRows({ status: "todos" }),
    listProductionEntryRows({}),
  ]);
  const categories: ProcedureCategory[] = categoryRows;
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const procedures: ProductionProcedure[] = procedureRows.map((procedure) => ({
    ...procedure,
    category_name:
      categoryNames.get(procedure.category_id) ?? "Categoria indisponível",
  }));
  const procedureById = new Map(
    procedures.map((procedure) => [procedure.id, procedure]),
  );
  const entries: ProductionIndicatorEntry[] = entryRows.map((entry) => {
    const procedure = procedureById.get(entry.procedure_id);
    return {
      ...entry,
      procedure_name: procedure?.name ?? "Procedimento indisponível",
      category_id: procedure?.category_id ?? "",
      category_name: procedure?.category_name ?? "Categoria indisponível",
    };
  });
  return { categories, procedures, entries };
}

export async function createProcedureCategory(name: string) {
  return callUuidRpc("create_procedure_category", { p_name: name });
}

export async function updateProcedureCategory(id: string, name: string) {
  return callBooleanRpc("update_procedure_category", {
    p_id: id,
    p_name: name,
  });
}

export async function setProcedureCategoryActive(id: string, active: boolean) {
  return callBooleanRpc("set_procedure_category_active", {
    p_id: id,
    p_active: active,
  });
}

export async function createProductionProcedure(input: {
  category_id: string;
  name: string;
  counting_unit: string;
}) {
  return callUuidRpc("create_production_procedure", {
    p_category_id: input.category_id,
    p_name: input.name,
    p_counting_unit: input.counting_unit,
  });
}

export async function updateProductionProcedure(input: {
  id: string;
  category_id: string;
  name: string;
  counting_unit: string;
}) {
  return callBooleanRpc("update_production_procedure", {
    p_id: input.id,
    p_category_id: input.category_id,
    p_name: input.name,
    p_counting_unit: input.counting_unit,
  });
}

export async function setProductionProcedureActive(
  id: string,
  active: boolean,
) {
  return callBooleanRpc("set_production_procedure_active", {
    p_id: id,
    p_active: active,
  });
}

export async function createProductionEntry(input: {
  procedure_id: string;
  reference_period: string;
  quantity: string;
  source: string;
}) {
  return callUuidRpc("create_production_entry", {
    p_procedure_id: input.procedure_id,
    p_reference_period: input.reference_period,
    p_quantity: input.quantity,
    p_source: input.source,
  });
}

export async function updateProductionEntry(input: {
  id: string;
  procedure_id: string;
  reference_period: string;
  quantity: string;
  source: string;
}) {
  return callBooleanRpc("update_production_entry", {
    p_id: input.id,
    p_procedure_id: input.procedure_id,
    p_reference_period: input.reference_period,
    p_quantity: input.quantity,
    p_source: input.source,
  });
}
