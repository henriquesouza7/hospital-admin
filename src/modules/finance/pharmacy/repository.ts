import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import type {
  ProductInput,
  PurchaseOrderInput,
  SupplierInput,
} from "./validation";
import { requireFinanceAdmin } from "./access";

const timestamp = z.string().datetime({ offset: true });
const numeric = z.union([z.string(), z.number()]).transform(String);

const supplierRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  is_active: z.boolean(),
  notes: z.string().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});

const productRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  presentation: z.string(),
  is_active: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});

const orderSummarySchema = z.object({
  id: z.string().uuid(),
  order_date: z.string(),
  supplier_name: z.string(),
  item_count: z.number().int(),
  total: numeric,
});

const orderDetailSchema = z.object({
  id: z.string().uuid(),
  order_date: z.string(),
  notes: z.string().nullable(),
  supplier: z.object({ name: z.string() }),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      quantity: numeric,
      unit_price: numeric,
      line_total: numeric,
      product: z.object({ name: z.string(), presentation: z.string() }),
    }),
  ),
});

const suppliersSchema = z.array(supplierRowSchema);
const productsSchema = z.array(productRowSchema);
const orderSummariesSchema = z.array(orderSummarySchema);

function requireData<T>(
  data: unknown,
  error: unknown,
  schema: z.ZodType<T>,
): T {
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível acessar os dados do Financeiro.");
  }

  return schema.parse(data);
}

export async function listSuppliers() {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("suppliers")
    .select("id,name,is_active,notes,created_at,updated_at")
    .order("name");

  return requireData(data, error, suppliersSchema);
}

export async function listActiveSuppliers() {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("suppliers")
    .select("id,name")
    .eq("is_active", true)
    .order("name");

  return requireData(
    data,
    error,
    z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  );
}

export async function listProducts(includeInactive = true) {
  await requireFinanceAdmin();
  let query = getNeonDataApiClient()
    .from("products")
    .select("id,name,category,presentation,is_active,created_at,updated_at")
    .eq("sector", "farmacia")
    .order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  return requireData(data, error, productsSchema);
}

export async function listPurchaseOrders() {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("purchase_order_summaries")
    .select("id,order_date,supplier_name,item_count,total")
    .eq("sector", "farmacia")
    .order("order_date", { ascending: false })
    .limit(100);

  return requireData(data, error, orderSummariesSchema);
}

export async function getPurchaseOrder(id: string) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("purchase_orders")
    .select(
      "id,order_date,notes,supplier:suppliers(name),items:purchase_order_items(id,quantity,unit_price,line_total,product:products(name,presentation))",
    )
    .eq("id", id)
    .eq("sector", "farmacia")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o pedido.");
  }

  return data ? orderDetailSchema.parse(data) : null;
}

export async function createSupplier(input: SupplierInput) {
  await requireFinanceAdmin();
  const { error } = await getNeonDataApiClient()
    .from("suppliers")
    .insert(input);
  if (error) throw new Error("Não foi possível cadastrar o fornecedor.");
}

export async function updateSupplier(id: string, input: SupplierInput) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Não foi possível atualizar o fornecedor.");
}

export async function setSupplierActive(id: string, isActive: boolean) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("suppliers")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Não foi possível alterar o status do fornecedor.");
}

export async function createProduct(input: ProductInput) {
  await requireFinanceAdmin();
  const { error } = await getNeonDataApiClient()
    .from("products")
    .insert({ ...input, sector: "farmacia" });
  if (error) throw new Error("Não foi possível cadastrar o produto.");
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("products")
    .update(input)
    .eq("id", id)
    .eq("sector", "farmacia")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Não foi possível atualizar o produto.");
}

export async function setProductActive(id: string, isActive: boolean) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("sector", "farmacia")
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Não foi possível alterar o status do produto.");
}

export async function createPurchaseOrder(input: PurchaseOrderInput) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "create_purchase_order",
    {
      p_sector: "farmacia",
      p_supplier_id: input.supplier_id,
      p_order_date: input.order_date,
      p_notes: input.notes,
      p_items: input.items,
    },
  );

  if (error || !z.string().uuid().safeParse(data).success) {
    throw new Error(
      "Não foi possível salvar o pedido. Confira fornecedor e produtos ativos.",
    );
  }

  return data;
}
