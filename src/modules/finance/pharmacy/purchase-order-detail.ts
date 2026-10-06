import { z } from "zod";

const numeric = z.union([z.string(), z.number()]).transform(String);

export const purchaseOrderDetailSchema = z.object({
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
      product_name_snapshot: z.string().min(1),
      product_presentation_snapshot: z.string().min(1),
      product_category_snapshot: z.string().nullable(),
    }),
  ),
});

export type PurchaseOrderDetail = z.infer<typeof purchaseOrderDetailSchema>;
