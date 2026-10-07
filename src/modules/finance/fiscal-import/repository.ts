import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireFinanceAdmin } from "../pharmacy/access";
import type { FinanceSector } from "../pharmacy/validation";
import type { NfeDocument } from "./domain";

export async function getFiscalImportPreviewStatus(accessKey: string) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("fiscal_imports")
    .select("id")
    .eq("access_key", accessKey)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar a chave da NF-e.");
  return Boolean(data);
}

export async function createFiscalPurchaseOrder(input: {
  sector: FinanceSector;
  supplierId: string;
  orderDate: string;
  notes: string;
  items: { product_id: string; quantity: string; unit_price: string }[];
  document: NfeDocument;
  xmlSha256: string;
}) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "create_fiscal_import_purchase_order",
    {
      p_sector: input.sector,
      p_supplier_id: input.supplierId,
      p_order_date: input.orderDate,
      p_notes: input.notes,
      p_items: input.items,
      p_access_key: input.document.accessKey,
      p_issuer_tax_id: input.document.issuerTaxId,
      p_issuer_name: input.document.issuerName,
      p_invoice_number: input.document.invoiceNumber,
      p_invoice_series: input.document.invoiceSeries,
      p_issued_at: input.document.issuedAt,
      p_invoice_total: input.document.invoiceTotal,
      p_xml_sha256: input.xmlSha256,
    },
  );
  if (error || !z.string().uuid().safeParse(data).success) {
    const message =
      error?.code === "23505"
        ? "Esta chave de acesso já foi importada."
        : "Não foi possível criar o pedido fiscal. Confira fornecedor e produtos ativos.";
    throw new Error(message);
  }
  return data;
}

export function hashFiscalXml(xml: Uint8Array): string {
  return createHash("sha256").update(xml).digest("hex");
}
