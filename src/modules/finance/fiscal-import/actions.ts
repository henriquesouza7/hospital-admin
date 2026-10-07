"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getNeonServerEnv } from "@/lib/neon/env";
import { MAX_XML_BYTES, parseNfeXml } from "./domain";
import { requireFinanceAdmin } from "../pharmacy/access";
import {
  createFiscalPurchaseOrder,
  getFiscalImportPreviewStatus,
  hashFiscalXml,
} from "./repository";
import {
  issueFiscalPreviewEvidence,
  verifyFiscalPreviewEvidence,
} from "./preview-evidence";
import {
  fiscalConfirmationSchema,
  hasUniqueProductMappings,
  validateNfeItemMapping,
} from "./validation";

export type FiscalPreviewState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      document: ReturnType<typeof parseNfeXml>;
      hash: string;
      previewToken: string;
      duplicate: boolean;
    };

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function readXmlFile(
  formData: FormData,
): Promise<{ xml: string; sha256: string }> {
  const file = formData.get("xml");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Selecione um arquivo XML de NF-e.");
  if (file.size > MAX_XML_BYTES)
    throw new Error("O arquivo XML excede o limite de 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_XML_BYTES)
    throw new Error("O arquivo XML excede o limite de 5 MB.");
  let xml: string;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
      xml = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
    else if (bytes[0] === 0xfe && bytes[1] === 0xff)
      xml = new TextDecoder("utf-16be", { fatal: true }).decode(bytes);
    else xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("A codificação do XML não é suportada ou está inválida.");
  }
  const sha256 = hashFiscalXml(bytes);
  return { xml, sha256 };
}

export async function previewFiscalXmlAction(
  _previous: FiscalPreviewState,
  formData: FormData,
): Promise<FiscalPreviewState> {
  const admin = await requireFinanceAdmin();
  try {
    const { xml, sha256 } = await readXmlFile(formData);
    const document = parseNfeXml(xml);
    const duplicate = await getFiscalImportPreviewStatus(document.accessKey);
    return {
      status: "success",
      document,
      hash: sha256,
      previewToken: issueFiscalPreviewEvidence(
        sha256,
        admin.id,
        getNeonServerEnv().authCookieSecret,
      ),
      duplicate,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível interpretar o XML da NF-e.",
    };
  }
}

export async function confirmFiscalImportAction(formData: FormData) {
  const admin = await requireFinanceAdmin();
  let orderId: string;
  let sector = "farmacia";
  try {
    const { xml, sha256: xmlSha256 } = await readXmlFile(formData);
    const document = parseNfeXml(xml);
    const previewToken = formValue(formData, "preview_token");
    if (!previewToken)
      throw new Error("Gere uma prévia válida antes de confirmar a NF-e.");
    const rawItems = formValue(formData, "items");
    let items: unknown;
    try {
      items = JSON.parse(rawItems);
    } catch {
      throw new Error("O mapeamento dos itens é inválido.");
    }
    const parsed = fiscalConfirmationSchema.safeParse({
      sector: formValue(formData, "sector"),
      supplierId: formValue(formData, "supplier_id"),
      orderDate: formValue(formData, "order_date"),
      notes: formValue(formData, "notes"),
      previewToken,
      items,
    });
    if (!parsed.success)
      throw new Error("Revise os campos e os itens da NF-e.");
    sector = parsed.data.sector;
    if (
      !verifyFiscalPreviewEvidence(
        parsed.data.previewToken,
        xmlSha256,
        admin.id,
        getNeonServerEnv().authCookieSecret,
      )
    )
      throw new Error("A prévia é inválida ou expirou. Gere uma nova prévia.");
    if (
      !validateNfeItemMapping(
        document.items.map((item) => item.itemNumber),
        parsed.data.items.map((item) => item.itemNumber),
      )
    ) {
      throw new Error(
        "Todos os itens originais devem ser mapeados uma única vez.",
      );
    }
    const productIds = parsed.data.items.map((item) => item.productId);
    if (!hasUniqueProductMappings(productIds))
      throw new Error(
        "Um produto não pode aparecer em mais de um item do pedido.",
      );
    const notes =
      parsed.data.notes ||
      `Importado da NF-e nº ${document.invoiceNumber}, série ${document.invoiceSeries}.`;
    const mappedItems = new Map(
      parsed.data.items.map((item) => [item.itemNumber, item]),
    );
    const fiscalItems = document.items.map((item) => {
      const mapping = mappedItems.get(item.itemNumber);
      if (!mapping)
        throw new Error("Todos os itens originais devem ser mapeados.");
      return {
        n_item: item.itemNumber,
        supplier_product_code: item.supplierCode,
        product_description: item.description,
        commercial_unit: item.unit,
        original_quantity: item.quantity,
        original_unit_price: item.unitPrice,
        original_product_total: item.productTotal,
        product_id: mapping.productId,
      };
    });
    orderId = await createFiscalPurchaseOrder({
      sector: parsed.data.sector,
      supplierId: parsed.data.supplierId,
      orderDate: parsed.data.orderDate,
      notes,
      items: parsed.data.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity.replace(",", "."),
        unit_price: item.unitPrice.replace(",", "."),
      })),
      fiscalItems,
      document,
      xmlSha256,
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "save";
    redirect(`/financeiro/importacao-fiscal?setor=${sector}&erro=${message}`);
  }

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/indicadores");
  revalidatePath(`/financeiro/${sector}`);
  redirect(`/financeiro/${sector}/pedidos/${orderId}`);
}
