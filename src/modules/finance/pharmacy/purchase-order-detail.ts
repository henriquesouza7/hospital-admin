import { z } from "zod";

const numeric = z.union([z.string(), z.number()]).transform(String);

export const purchaseOrderDetailSchema = z.object({
  id: z.string().uuid(),
  order_date: z.string(),
  notes: z.string().nullable(),
  supplier: z.object({ name: z.string() }),
  fiscalImport: z
    .object({
      access_key: z.string(),
      issuer_tax_id: z.string().nullable(),
      issuer_name: z.string(),
      invoice_number: z.string(),
      invoice_series: z.string(),
      issued_at: z.string(),
      invoice_total: numeric,
      xml_sha256: z.string(),
    })
    .nullable()
    .optional(),
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
