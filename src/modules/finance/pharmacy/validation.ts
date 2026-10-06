import { z } from "zod";

const decimalText = /^\d{1,10}(?:[.,]\d{1,2})?$/;
const quantityText = /^\d{1,9}(?:[.,]\d{1,3})?$/;
const uuidText = z.string().uuid();

function scaledValue(value: string, scale: number): bigint {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return (
    BigInt(whole) * BigInt(10) ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, "0"))
  );
}

export const supplierInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor.").max(160),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
});

export const supplierUpdateSchema = supplierInputSchema.extend({
  id: uuidText,
});

export const supplierStatusSchema = z.object({
  id: uuidText,
  is_active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto.").max(160),
  category: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null),
  presentation: z
    .string()
    .trim()
    .min(1, "Informe a unidade ou apresentação.")
    .max(120),
});

export const productUpdateSchema = productInputSchema.extend({
  id: uuidText,
});

export const productStatusSchema = z.object({
  id: uuidText,
  is_active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const purchaseOrderItemSchema = z.object({
  product_id: uuidText,
  quantity: z
    .string()
    .trim()
    .regex(
      quantityText,
      "Informe uma quantidade válida, com até 3 casas decimais.",
    )
    .refine(
      (value) => scaledValue(value, 3) > BigInt(0),
      "A quantidade deve ser maior que zero.",
    )
    .transform((value) => value.replace(",", ".")),
  unit_price: z
    .string()
    .trim()
    .regex(decimalText, "Informe um valor válido, com até 2 casas decimais.")
    .transform((value) => value.replace(",", ".")),
});

export const purchaseOrderInputSchema = z.object({
  supplier_id: uuidText,
  order_date: z.iso.date(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
  items: z.array(purchaseOrderItemSchema).min(1).max(100),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;

export function parsePurchaseOrderForm(formData: FormData) {
  let items: unknown;

  try {
    items = JSON.parse(String(formData.get("items") ?? ""));
  } catch {
    items = null;
  }

  return purchaseOrderInputSchema.safeParse({
    supplier_id: formData.get("supplier_id"),
    order_date: formData.get("order_date"),
    notes: formData.get("notes") ?? "",
    items,
  });
}

export function calculateLineTotalCents(
  quantity: string,
  unitPrice: string,
): bigint {
  const quantityThousandths = scaledValue(quantity, 3);
  const unitPriceCents = scaledValue(unitPrice, 2);

  return (quantityThousandths * unitPriceCents + BigInt(500)) / BigInt(1000);
}

export function calculateOrderTotalCents(
  items: ReadonlyArray<{ quantity: string; unitPrice: string }>,
): bigint {
  return items.reduce(
    (total, item) =>
      total + calculateLineTotalCents(item.quantity, item.unitPrice),
    BigInt(0),
  );
}

export function formatCents(cents: bigint): string {
  const whole = cents / BigInt(100);
  const fraction = (cents % BigInt(100)).toString().padStart(2, "0");
  return `${whole},${fraction}`;
}
