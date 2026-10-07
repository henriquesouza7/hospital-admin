"use server";

import { revalidatePath } from "next/cache";
import type { ProductionActionState } from "./action-state";
import { requireProductionAdmin } from "./access";
import {
  createProductionEntry,
  createProductionProcedure,
  createProcedureCategory,
  DuplicateProductionRecordError,
  setProductionProcedureActive,
  setProcedureCategoryActive,
  updateProductionEntry,
  updateProductionProcedure,
  updateProcedureCategory,
} from "./repository";
import {
  categoryInputSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
  productionEntryInputSchema,
  productionEntryUpdateSchema,
  procedureInputSchema,
  procedureStatusSchema,
  procedureUpdateSchema,
  readFormValue,
} from "./validation";

function invalidInput(): ProductionActionState {
  return { status: "error", message: "Confira os campos e tente novamente." };
}

function actionError(error: unknown): ProductionActionState {
  if (error instanceof DuplicateProductionRecordError) {
    return { status: "error", message: error.message };
  }
  if (
    error instanceof Error &&
    error.message.startsWith("Inative os procedimentos")
  ) {
    return { status: "error", message: error.message };
  }
  return {
    status: "error",
    message: "Não foi possível salvar. Tente novamente.",
  };
}

function refreshCatalog() {
  revalidatePath("/producao");
  revalidatePath("/producao/procedimentos");
  revalidatePath("/producao/lancamentos");
}

function refreshEntries() {
  revalidatePath("/producao");
  revalidatePath("/producao/lancamentos");
}

export async function createCategoryAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = categoryInputSchema.safeParse({
    name: readFormValue(formData, "name"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await createProcedureCategory(parsed.data.name);
    refreshCatalog();
    return { status: "success", message: "Categoria cadastrada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategoryAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = categoryUpdateSchema.safeParse({
    id: readFormValue(formData, "id"),
    name: readFormValue(formData, "name"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await updateProcedureCategory(parsed.data.id, parsed.data.name);
    refreshCatalog();
    return { status: "success", message: "Categoria atualizada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setCategoryStatusAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = categoryStatusSchema.safeParse({
    id: readFormValue(formData, "id"),
    active: readFormValue(formData, "active"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await setProcedureCategoryActive(parsed.data.id, parsed.data.active);
    refreshCatalog();
    return { status: "success", message: "Status da categoria atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function createProcedureAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = procedureInputSchema.safeParse({
    category_id: readFormValue(formData, "category_id"),
    name: readFormValue(formData, "name"),
    counting_unit: readFormValue(formData, "counting_unit"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await createProductionProcedure(parsed.data);
    refreshCatalog();
    return { status: "success", message: "Procedimento cadastrado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProcedureAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = procedureUpdateSchema.safeParse({
    id: readFormValue(formData, "id"),
    category_id: readFormValue(formData, "category_id"),
    name: readFormValue(formData, "name"),
    counting_unit: readFormValue(formData, "counting_unit"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await updateProductionProcedure(parsed.data);
    refreshCatalog();
    return { status: "success", message: "Procedimento atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setProcedureStatusAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = procedureStatusSchema.safeParse({
    id: readFormValue(formData, "id"),
    active: readFormValue(formData, "active"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await setProductionProcedureActive(parsed.data.id, parsed.data.active);
    refreshCatalog();
    return { status: "success", message: "Status do procedimento atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function createProductionEntryAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = productionEntryInputSchema.safeParse({
    procedure_id: readFormValue(formData, "procedure_id"),
    reference_period: readFormValue(formData, "reference_period"),
    quantity: readFormValue(formData, "quantity"),
    source: readFormValue(formData, "source"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await createProductionEntry(parsed.data);
    refreshEntries();
    return { status: "success", message: "Lançamento registrado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProductionEntryAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  await requireProductionAdmin();
  const parsed = productionEntryUpdateSchema.safeParse({
    id: readFormValue(formData, "id"),
    procedure_id: readFormValue(formData, "procedure_id"),
    reference_period: readFormValue(formData, "reference_period"),
    quantity: readFormValue(formData, "quantity"),
    source: readFormValue(formData, "source"),
  });
  if (!parsed.success) return invalidInput();
  try {
    await updateProductionEntry(parsed.data);
    refreshEntries();
    return { status: "success", message: "Lançamento atualizado." };
  } catch (error) {
    return actionError(error);
  }
}
