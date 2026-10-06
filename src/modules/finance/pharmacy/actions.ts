"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FinanceActionState } from "./action-state";
import {
  createProduct,
  createPurchaseOrder,
  createSupplier,
  setProductActive,
  setSupplierActive,
  updateProduct,
  updateSupplier,
} from "./repository";
import {
  parsePurchaseOrderForm,
  productInputSchema,
  productStatusSchema,
  productUpdateSchema,
  supplierInputSchema,
  supplierStatusSchema,
  supplierUpdateSchema,
  financeSectorSchema,
} from "./validation";

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

function invalidForm(): FinanceActionState {
  return { status: "error", message: "Confira os campos e tente novamente." };
}

export async function createSupplierAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = supplierInputSchema.safeParse({
    name: value(formData, "name"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return invalidForm();

  try {
    await createSupplier(parsed.data);
    revalidatePath("/financeiro/farmacia/fornecedores");
    revalidatePath("/financeiro/farmacia");
    revalidatePath("/financeiro/laboratorio");
    return { status: "success", message: "Fornecedor cadastrado." };
  } catch {
    return {
      status: "error",
      message: "Não foi possível cadastrar o fornecedor.",
    };
  }
}

export async function updateSupplierAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = supplierUpdateSchema.safeParse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return invalidForm();

  try {
    const { id, ...input } = parsed.data;
    await updateSupplier(id, input);
    revalidatePath("/financeiro/farmacia/fornecedores");
    revalidatePath("/financeiro/farmacia");
    revalidatePath("/financeiro/laboratorio");
    return { status: "success", message: "Fornecedor atualizado." };
  } catch {
    return {
      status: "error",
      message: "Não foi possível atualizar o fornecedor.",
    };
  }
}

export async function setSupplierStatusAction(formData: FormData) {
  const parsed = supplierStatusSchema.safeParse({
    id: value(formData, "id"),
    is_active: value(formData, "is_active"),
  });
  if (!parsed.success)
    throw new Error("Dados inválidos para alterar o fornecedor.");

  await setSupplierActive(parsed.data.id, parsed.data.is_active);
  revalidatePath("/financeiro/farmacia/fornecedores");
  revalidatePath("/financeiro/farmacia");
  revalidatePath("/financeiro/laboratorio");
}

export async function createProductAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = productInputSchema.safeParse({
    name: value(formData, "name"),
    category: value(formData, "category"),
    presentation: value(formData, "presentation"),
  });
  if (!parsed.success) return invalidForm();
  const sector = financeSectorSchema.safeParse(value(formData, "sector"));
  if (!sector.success) return invalidForm();

  try {
    await createProduct(sector.data, parsed.data);
    revalidatePath(`/financeiro/${sector.data}/produtos`);
    revalidatePath(`/financeiro/${sector.data}/pedidos/novo`);
    return { status: "success", message: "Produto cadastrado." };
  } catch {
    return {
      status: "error",
      message: "Não foi possível cadastrar o produto.",
    };
  }
}

export async function updateProductAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = productUpdateSchema.safeParse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    category: value(formData, "category"),
    presentation: value(formData, "presentation"),
    sector: value(formData, "sector"),
  });
  if (!parsed.success) return invalidForm();

  try {
    const { id, sector, ...input } = parsed.data;
    await updateProduct(id, sector, input);
    revalidatePath(`/financeiro/${sector}/produtos`);
    revalidatePath(`/financeiro/${sector}/pedidos/novo`);
    return { status: "success", message: "Produto atualizado." };
  } catch {
    return {
      status: "error",
      message: "Não foi possível atualizar o produto.",
    };
  }
}

export async function setProductStatusAction(formData: FormData) {
  const parsed = productStatusSchema.safeParse({
    id: value(formData, "id"),
    sector: value(formData, "sector"),
    is_active: value(formData, "is_active"),
  });
  if (!parsed.success)
    throw new Error("Dados inválidos para alterar o produto.");

  await setProductActive(
    parsed.data.id,
    parsed.data.sector,
    parsed.data.is_active,
  );
  revalidatePath(`/financeiro/${parsed.data.sector}/produtos`);
  revalidatePath(`/financeiro/${parsed.data.sector}/pedidos/novo`);
}

export async function createPurchaseOrderAction(formData: FormData) {
  const parsed = parsePurchaseOrderForm(formData);
  const sector = financeSectorSchema.safeParse(value(formData, "sector"));
  const basePath = sector.success
    ? `/financeiro/${sector.data}`
    : "/financeiro/farmacia";
  if (!parsed.success) {
    redirect(`${basePath}/pedidos/novo?error=validation`);
  }

  let id: string;
  try {
    id = await createPurchaseOrder(parsed.data);
  } catch {
    redirect(`${basePath}/pedidos/novo?error=save`);
  }

  revalidatePath(basePath);
  redirect(`${basePath}/pedidos/${id}`);
}
