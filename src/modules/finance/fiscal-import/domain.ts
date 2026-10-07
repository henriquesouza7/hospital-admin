import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

export const MAX_XML_BYTES = 5 * 1024 * 1024;
export const MAX_INVOICE_ITEMS = 100;

const nfeItemSchema = z.object({
  itemNumber: z
    .string()
    .regex(/^\d{1,3}$/)
    .refine((value) => /^\d{1,3}$/.test(value) && BigInt(value) > BigInt(0)),
  supplierCode: z.string().max(60),
  description: z.string().min(1).max(255),
  unit: z.string().max(10),
  quantity: z.string().regex(/^\d{1,24}(?:\.\d{1,24})?$/),
  unitPrice: z.string().regex(/^\d{1,24}(?:\.\d{1,24})?$/),
  productTotal: z.string().regex(/^\d{1,24}(?:\.\d{1,2})?$/),
});

export const nfeDocumentSchema = z.object({
  accessKey: z.string().regex(/^\d{44}$/),
  issuerTaxId: z.string().max(20),
  issuerName: z.string().min(1).max(160),
  invoiceNumber: z.string().min(1).max(32),
  invoiceSeries: z.string().min(1).max(10),
  issuedAt: z.string().min(1).max(40),
  orderDate: z.iso.date(),
  invoiceTotal: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
  items: z.array(nfeItemSchema).min(1).max(MAX_INVOICE_ITEMS),
});

export type NfeDocument = z.infer<typeof nfeDocumentSchema>;
export type NfeItem = NfeDocument["items"][number];

export type FiscalImportItemPayload = {
  n_item: string;
  supplier_product_code: string;
  product_description: string;
  commercial_unit: string;
  original_quantity: string;
  original_unit_price: string;
  original_product_total: string;
  product_id: string;
};

type XmlRecord = Record<string, unknown>;

function record(value: unknown): XmlRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as XmlRecord)
    : null;
}

function child(value: unknown, key: string): unknown {
  return record(value)?.[key];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim();
  return "";
}

function required(value: unknown, label: string): string {
  const result = text(value);
  if (!result) throw new Error(`O XML não contém ${label}.`);
  return result;
}

function normalizeKey(value: string, label: string): string {
  const key = value.replace(/^NFe/i, "");
  if (!/^\d{44}$/.test(key))
    throw new Error(`A chave de acesso informada em ${label} é inválida.`);
  return key;
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function asDate(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (!match || !z.iso.date().safeParse(match[1]).success)
    throw new Error("A data de emissão da NF-e é inválida.");
  return match[1];
}

export function parseNfeXml(xml: string): NfeDocument {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES)
    throw new Error("O XML excede o limite de 5 MB.");
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))
    throw new Error(
      "O XML contém declarações DOCTYPE ou ENTITY não permitidas.",
    );
  if (XMLValidator.validate(xml) !== true)
    throw new Error("O arquivo não contém um XML válido.");

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    processEntities: false,
    parseTagValue: false,
    trimValues: true,
  });
  const root = record(parser.parse(xml));
  const processed = child(root, "nfeProc");
  const nfe = child(processed, "NFe") ?? child(root, "NFe") ?? root;
  const info = child(nfe, "infNFe");
  if (!record(info)) throw new Error("Estrutura de NF-e não reconhecida.");

  const infoId = text(child(info, "@_Id"));
  const protocolKey = text(
    child(child(child(processed, "protNFe"), "infProt"), "chNFe"),
  );
  const keys = [
    ...(infoId ? [normalizeKey(infoId, "infNFe/@Id")] : []),
    ...(protocolKey ? [normalizeKey(protocolKey, "protocolo")] : []),
  ];
  if (!keys.length) throw new Error("A NF-e não contém chave de acesso.");
  if (keys.some((key) => key !== keys[0]))
    throw new Error("As chaves de acesso presentes no XML são divergentes.");

  const ide = child(info, "ide");
  const emit = child(info, "emit");
  const total = child(info, "total");
  const invoiceTotal = child(child(total, "ICMSTot"), "vNF");
  const det = child(info, "det");
  const detailRows = array(det);
  if (detailRows.length > MAX_INVOICE_ITEMS)
    throw new Error("A NF-e excede o limite atual de 100 itens.");

  const items = detailRows.map((entry, index) => {
    const product = child(entry, "prod");
    return {
      itemNumber: required(
        child(entry, "@_nItem"),
        `número do item ${index + 1}`,
      ),
      supplierCode: text(child(product, "cProd")),
      description: required(
        child(product, "xProd"),
        `descrição do item ${index + 1}`,
      ),
      unit: text(child(product, "uCom")),
      quantity: required(
        child(product, "qCom"),
        `quantidade do item ${index + 1}`,
      ),
      unitPrice: required(
        child(product, "vUnCom"),
        `valor unitário do item ${index + 1}`,
      ),
      productTotal: required(
        child(product, "vProd"),
        `valor do item ${index + 1}`,
      ),
    };
  });
  const itemNumbers = items.map((item) => item.itemNumber);
  if (new Set(itemNumbers).size !== itemNumbers.length)
    throw new Error("O XML contém números de item duplicados.");

  return nfeDocumentSchema.parse({
    accessKey: keys[0],
    issuerTaxId: text(child(emit, "CNPJ")) || text(child(emit, "CPF")),
    issuerName: required(child(emit, "xNome"), "razão social do emitente"),
    invoiceNumber: required(child(ide, "nNF"), "número da NF-e"),
    invoiceSeries: required(child(ide, "serie"), "série da NF-e"),
    issuedAt: required(
      child(ide, "dhEmi") ?? child(ide, "dEmi"),
      "data de emissão",
    ),
    orderDate: asDate(
      required(child(ide, "dhEmi") ?? child(ide, "dEmi"), "data de emissão"),
    ),
    invoiceTotal: required(invoiceTotal, "valor total da NF-e"),
    items,
  });
}
