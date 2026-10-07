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
  const { data, error } = await getNeonDataApiClient()
    .from("procedure_categories")
    .select("id,name,active,created_at,updated_at")
    .order("name", { ascending: true });
  return requireData(
    data,
    error,
    "Não foi possível carregar as categorias.",
    z.array(categoryRowSchema),
  );
}

export async function listProductionProcedures(
  filters: {
    category_id?: string;
    status?: "todos" | "ativos" | "inativos";
  } = {},
): Promise<ProductionProcedure[]> {
  await requireProductionAdmin();
  let query = getNeonDataApiClient()
    .from("procedures")
    .select("id,category_id,name,counting_unit,active,created_at,updated_at")
    .order("name", { ascending: true });
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.status === "ativos") query = query.eq("active", true);
  if (filters.status === "inativos") query = query.eq("active", false);

  const [{ data, error }, categories] = await Promise.all([
    query,
    listProcedureCategories(),
  ]);
  const rows = requireData(
    data,
    error,
    "Não foi possível carregar os procedimentos.",
    z.array(procedureRowSchema),
  );
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  return rows.map((procedure) => ({
    ...procedure,
    category_name:
      categoryNames.get(procedure.category_id) ?? "Categoria indisponível",
  }));
}

export async function listProductionEntries(
  filters: {
    procedure_id?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<ProductionEntry[]> {
  await requireProductionAdmin();
  let query = getNeonDataApiClient()
    .from("production_entries")
    .select(
      "id,procedure_id,counting_unit,reference_period,quantity,source,created_at,updated_at",
    )
    .order("reference_period", { ascending: false });
  if (filters.procedure_id)
    query = query.eq("procedure_id", filters.procedure_id);
  if (filters.from) query = query.gte("reference_period", `${filters.from}-01`);
  if (filters.to) query = query.lte("reference_period", `${filters.to}-01`);

  const [{ data, error }, procedures, categories] = await Promise.all([
    query,
    listProductionProcedures(),
    listProcedureCategories(),
  ]);
  const rows = requireData(
    data,
    error,
    "Não foi possível carregar os lançamentos.",
    z.array(entryRowSchema),
  );
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

export async function createProcedureCategory(name: string) {
  await requireProductionAdmin();
  return callUuidRpc("create_procedure_category", { p_name: name });
}

export async function updateProcedureCategory(id: string, name: string) {
  await requireProductionAdmin();
  return callBooleanRpc("update_procedure_category", {
    p_id: id,
    p_name: name,
  });
}

export async function setProcedureCategoryActive(id: string, active: boolean) {
  await requireProductionAdmin();
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
  await requireProductionAdmin();
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
  await requireProductionAdmin();
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
  await requireProductionAdmin();
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
  await requireProductionAdmin();
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
  await requireProductionAdmin();
  return callBooleanRpc("update_production_entry", {
    p_id: input.id,
    p_procedure_id: input.procedure_id,
    p_reference_period: input.reference_period,
    p_quantity: input.quantity,
    p_source: input.source,
  });
}
