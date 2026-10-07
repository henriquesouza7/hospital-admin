import { z } from "zod";
import { financeSectorSchema } from "../pharmacy/validation";

const uuid = z.string().uuid();
const quantity = /^\d{1,9}(?:[.,]\d{1,3})?$/;
const unitPrice = /^\d{1,10}(?:[.,]\d{1,2})?$/;

function isPositiveQuantity(value: string): boolean {
  if (!quantity.test(value)) return false;
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return BigInt(`${whole}${fraction}`) > BigInt(0);
}

export const fiscalConfirmationSchema = z.object({
  sector: financeSectorSchema,
  supplierId: uuid,
  orderDate: z.iso.date(),
  notes: z.string().trim().max(1000),
  previewHash: z.string().regex(/^[0-9a-f]{64}$/),
  items: z
    .array(
      z.object({
        itemNumber: z.string().min(1),
        productId: uuid,
        quantity: z.string().regex(quantity).refine(isPositiveQuantity),
        unitPrice: z.string().regex(unitPrice),
      }),
    )
    .min(1)
    .max(100),
});

export function validateNfeItemMapping(
  expected: readonly string[],
  received: readonly string[],
): boolean {
  return (
    new Set(received).size === received.length &&
    expected.length === received.length &&
    expected.every((itemNumber) => received.includes(itemNumber))
  );
}

export function hasUniqueProductMappings(
  productIds: readonly string[],
): boolean {
  return new Set(productIds).size === productIds.length;
}
