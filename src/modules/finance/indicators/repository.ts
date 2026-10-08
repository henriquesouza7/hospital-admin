import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireFinanceAdmin } from "@/modules/finance/pharmacy/access";
import type { IndicatorFairExpense, IndicatorPurchase } from "./domain";

const PAGE_SIZE = 1000;
const numeric = z.union([z.string(), z.number()]).transform(String);
const supplierSchema = z.object({ id: z.string().uuid(), name: z.string() });
const itemSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: numeric,
  unit_price: numeric,
  line_total: numeric,
  product_name_snapshot: z.string().min(1),
  product_presentation_snapshot: z.string().min(1),
  product_category_snapshot: z.string().nullable(),
});
const itemWithOrderSchema = itemSchema.extend({
  purchase_order: z.object({
    sector: z.enum(["farmacia", "laboratorio"]),
    order_date: z.iso.date(),
    supplier: supplierSchema,
  }),
});
const fairSchema = z.array(
  z.object({
    competence: z.iso.date(),
    total_amount: numeric,
  }),
);
const monthlyTotalsSchema = z.array(
  z.object({
    competence: z.iso.date(),
    pharmacy_total: numeric,
    laboratory_total: numeric,
    fair_total: numeric,
    pharmacy_item_count: z.number().int().nonnegative(),
    laboratory_item_count: z.number().int().nonnegative(),
    has_fair_record: z.boolean(),
  }),
);
const productSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sector: z.enum(["farmacia", "laboratorio"]),
    name: z.string(),
    presentation: z.string(),
    is_active: z.boolean(),
  }),
);
type ProductOption = z.infer<typeof productSchema>[number];

function assertData<T>(data: unknown, error: unknown, schema: z.ZodType<T>): T {
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar os indicadores do Financeiro.");
  }
  return schema.parse(data);
}

export async function loadIndicatorsSource(
  startMonth: string,
  endMonth: string,
  options: Readonly<{
    maxPurchaseRows?: number;
    includeProducts?: boolean;
  }> = {},
) {
  await requireFinanceAdmin();
  const from = `${startMonth}-01`;
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const throughExclusive = `${new Date(Date.UTC(endYear, endMonthNumber, 1)).toISOString().slice(0, 10)}`;

  const purchases: IndicatorPurchase[] = [];
  const purchaseLimit =
    options.maxPurchaseRows === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.floor(options.maxPurchaseRows));
  for (const sector of ["farmacia", "laboratorio"] as const) {
    let offset = 0;
    while (purchases.length < purchaseLimit) {
      const pageSize = Math.min(PAGE_SIZE, purchaseLimit - purchases.length);
      const { data, error } = await getNeonDataApiClient()
        .from("purchase_order_items")
        .select(
          "id,product_id,quantity,unit_price,line_total,product_name_snapshot,product_presentation_snapshot,product_category_snapshot,purchase_order:purchase_orders!inner(sector,order_date,supplier:suppliers!inner(id,name))",
        )
        .eq("purchase_order.sector", sector)
        .gte("purchase_order.order_date", from)
        .lt("purchase_order.order_date", throughExclusive)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      const items = assertData(data, error, z.array(itemWithOrderSchema));
      purchases.push(
        ...items.map((item) => ({
          id: item.id,
          sector: item.purchase_order.sector,
          productId: item.product_id,
          supplierId: item.purchase_order.supplier.id,
          supplierName: item.purchase_order.supplier.name,
          orderDate: item.purchase_order.order_date,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total,
          productName: item.product_name_snapshot,
          presentation: item.product_presentation_snapshot,
          category: item.product_category_snapshot,
        })),
      );
      if (items.length < pageSize) break;
      offset += pageSize;
    }
    if (purchases.length >= purchaseLimit) break;
  }

  const { data: fairData, error: fairError } = await getNeonDataApiClient()
    .from("monthly_fair_expenses")
    .select("competence,total_amount")
    .gte("competence", from)
    .lt("competence", throughExclusive)
    .order("competence", { ascending: true });

  const products: ProductOption[] = [];
  if (options.includeProducts !== false) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await getNeonDataApiClient()
        .from("products")
        .select("id,sector,name,presentation,is_active")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      const rows = assertData(data, error, productSchema);
      products.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }
  }

  return {
    purchases,
    fairExpenses: assertData(fairData, fairError, fairSchema).map(
      (expense): IndicatorFairExpense => ({
        competence: expense.competence,
        totalAmount: expense.total_amount,
      }),
    ),
    products,
  };
}

export async function listMonthlyExpenseTotals(
  startMonth: string,
  endMonth: string,
) {
  await requireFinanceAdmin();
  const from = `${startMonth}-01`;
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const throughExclusive = new Date(Date.UTC(endYear, endMonthNumber, 1))
    .toISOString()
    .slice(0, 10);
  const { data, error } = await getNeonDataApiClient().rpc(
    "list_monthly_expense_totals",
    { p_start: from, p_through_exclusive: throughExclusive },
  );
  return assertData(data, error, monthlyTotalsSchema);
}
