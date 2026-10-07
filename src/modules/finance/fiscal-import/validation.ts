import { z } from "zod";
import { financeSectorSchema } from "../pharmacy/validation";

const uuid = z.string().uuid();
export const purchaseQuantityPattern = /^\d{1,9}(?:[.,]\d{1,3})?$/;
export const purchaseUnitPricePattern = /^\d{1,10}(?:[.,]\d{1,2})?$/;

export function isValidPurchaseQuantity(value: string): boolean {
  if (!purchaseQuantityPattern.test(value)) return false;
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return BigInt(`${whole}${fraction}`) > BigInt(0);
}

export function isValidPurchaseUnitPrice(value: string): boolean {
  return purchaseUnitPricePattern.test(value);
}

export const fiscalConfirmationSchema = z.object({
  sector: financeSectorSchema,
  supplierId: uuid,
  orderDate: z.iso.date(),
  notes: z.string().trim().max(1000),
  previewToken: z.string().min(1).max(2048),
  items: z
    .array(
      z.object({
        itemNumber: z.string().min(1),
        productId: uuid,
        quantity: z.string().refine(isValidPurchaseQuantity),
        unitPrice: z.string().refine(isValidPurchaseUnitPrice),
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

export function canConfirmFiscalImport(input: {
  sector: string;
  supplierId: string;
  allowedProductIds: readonly string[];
  items: readonly {
    productId: string;
    quantity: string;
    unitPrice: string;
  }[];
}): boolean {
  const productIds = input.items.map((item) => item.productId);
  return (
    (input.sector === "farmacia" || input.sector === "laboratorio") &&
    input.supplierId.length > 0 &&
    input.items.length > 0 &&
    input.items.every(
      (item) =>
        item.productId.length > 0 &&
        input.allowedProductIds.includes(item.productId) &&
        isValidPurchaseQuantity(item.quantity) &&
        isValidPurchaseUnitPrice(item.unitPrice),
    ) &&
    hasUniqueProductMappings(productIds)
  );
}
