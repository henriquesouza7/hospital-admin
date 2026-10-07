"use client";

import {
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { ArrowRight, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { listActiveSuppliers, listProducts } from "../pharmacy/repository";
import type { FinanceSector } from "../pharmacy/validation";
import { confirmFiscalImportAction, previewFiscalXmlAction } from "./actions";
import type { FiscalPreviewState } from "./actions";

type Supplier = Awaited<ReturnType<typeof listActiveSuppliers>>[number];
type Product = Awaited<ReturnType<typeof listProducts>>[number];

const initialState: FiscalPreviewState = { status: "idle" };
const MAX_XML_SIZE = 5 * 1024 * 1024;

function money(value: string): string {
  const [whole, fraction] = value.split(".");
  return `R$ ${whole}${fraction ? `,${fraction}` : ",00"}`;
}

export function FiscalImportForm({
  suppliers,
  products,
  initialSector,
  error,
}: {
  suppliers: Supplier[];
  products: Product[];
  initialSector: FinanceSector | "";
  error?: string;
}) {
  const [state, previewAction, pending] = useActionState(
    previewFiscalXmlAction,
    initialState,
  );
  const [confirmPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileHash, setSelectedFileHash] = useState("");
  const [sector, setSector] = useState<FinanceSector | "">(initialSector);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [draftHash, setDraftHash] = useState("");
  const [mappedProducts, setMappedProducts] = useState<Record<string, string>>(
    {},
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const previewIsCurrent =
    state.status === "success" && selectedFileHash === state.hash;
  const document =
    previewIsCurrent && state.status === "success" ? state.document : null;
  const sectorProducts = useMemo(
    () => products.filter((product) => product.sector === sector),
    [products, sector],
  );

  const sameDraft = previewIsCurrent && draftHash === state.hash;

  const itemsJson = document
    ? JSON.stringify(
        document.items.map((item) => ({
          itemNumber: item.itemNumber,
          productId: sameDraft ? (mappedProducts[item.itemNumber] ?? "") : "",
          quantity: sameDraft
            ? (quantities[item.itemNumber] ?? item.quantity)
            : item.quantity,
          unitPrice: sameDraft
            ? (unitPrices[item.itemNumber] ?? item.unitPrice)
            : item.unitPrice,
        })),
      )
    : "[]";
  const orderItemsTotalCents = document
    ? document.items.reduce<bigint | null>((total, item) => {
        const quantity = sameDraft
          ? (quantities[item.itemNumber] ?? item.quantity)
          : item.quantity;
        const unitPrice = sameDraft
          ? (unitPrices[item.itemNumber] ?? item.unitPrice)
          : item.unitPrice;
        const cents = lineTotal(quantity, unitPrice).cents;
        return total === null || cents === null ? null : total + cents;
      }, BigInt(0))
    : null;
  const invoiceTotalCents = document
    ? amountToCents(document.invoiceTotal)
    : null;
  const totalsDiffer =
    orderItemsTotalCents !== null &&
    invoiceTotalCents !== null &&
    orderItemsTotalCents !== invoiceTotalCents;
  const usedProductIds = new Set(
    (sameDraft ? Object.values(mappedProducts) : []).filter(Boolean),
  );

  return (
    <form
      ref={formRef}
      action={previewAction}
      onSubmit={(event) => {
        event.preventDefault();
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        if (selectedFile) formData.set("xml", selectedFile, selectedFile.name);
        startTransition(() => {
          previewAction(formData);
        });
      }}
      className="space-y-6"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Setor{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <select
            name="sector"
            required
            value={sector}
            onChange={(event) => {
              setSector(event.target.value as FinanceSector | "");
              setMappedProducts({});
            }}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          >
            <option value="" disabled>
              Selecione Farmácia ou Laboratório
            </option>
            <option value="farmacia">Farmácia</option>
            <option value="laboratorio">Laboratório</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Arquivo NF-e XML{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <input
            name="xml"
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              selectedFileRef.current = file;
              setSelectedFile(file);
              setSelectedFileHash("");
              if (file && file.size <= MAX_XML_SIZE) {
                void file
                  .arrayBuffer()
                  .then(async (contents) => {
                    const digest = await crypto.subtle.digest(
                      "SHA-256",
                      contents,
                    );
                    const fileHash = Array.from(
                      new Uint8Array(digest),
                      (byte) => byte.toString(16).padStart(2, "0"),
                    ).join("");
                    if (selectedFileRef.current === file)
                      setSelectedFileHash(fileHash);
                  })
                  .catch(() => setSelectedFileHash(""));
              }
            }}
            className="min-h-10 rounded-lg border bg-background px-3 py-2 font-normal file:mr-3 file:border-0 file:bg-transparent"
          />
          {selectedFile ? (
            <span className="text-xs font-normal text-muted-foreground">
              Arquivo selecionado para esta sessão: {selectedFile.name}
            </span>
          ) : null}
          {selectedFile && selectedFile.size > MAX_XML_SIZE ? (
            <span role="alert" className="text-xs font-medium text-destructive">
              O arquivo excede o limite de 5 MB.
            </span>
          ) : null}
          <span className="text-xs font-normal text-muted-foreground">
            Limite de 5 MB. O XML não será armazenado.
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={
            pending || !selectedFile || selectedFile.size > MAX_XML_SIZE
          }
        >
          <FileUp aria-hidden="true" />
          {pending ? "Lendo XML…" : "Gerar prévia"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Os dados vêm do arquivo informado; não há consulta online à SEFAZ.
        </p>
      </div>
      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "success" && !previewIsCurrent ? (
        <p
          role="status"
          className="rounded-lg border bg-muted/50 px-4 py-3 text-sm"
        >
          O arquivo foi alterado. Gere uma nova prévia antes de confirmar.
        </p>
      ) : null}

      {document && state.status === "success" ? (
        <>
          {state.duplicate ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              Esta chave de acesso já consta como importada. Nenhum pedido será
              criado.
            </p>
          ) : null}
          <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <h2 className="font-semibold">Prévia da NF-e</h2>
            </div>
            <Info label="Chave de acesso" value={document.accessKey} />
            <Info
              label="Número / série"
              value={`${document.invoiceNumber} / ${document.invoiceSeries}`}
            />
            <Info label="Emissão" value={document.issuedAt} />
            <Info
              label="Total informado na NF-e"
              value={money(document.invoiceTotal)}
            />
            <Info label="Emitente" value={document.issuerName} />
            <Info
              label="CNPJ/CPF no XML"
              value={document.issuerTaxId || "Não informado"}
            />
          </section>

          <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Fornecedor cadastrado{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <select
                name="supplier_id"
                required
                value={sameDraft ? supplierId : ""}
                onChange={(event) => {
                  setDraftHash(state.hash);
                  setSupplierId(event.target.value);
                }}
                className="h-10 rounded-lg border bg-background px-3 font-normal"
              >
                <option value="" disabled>
                  Selecione manualmente
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {!suppliers.length ? (
                <span className="text-xs font-normal text-destructive">
                  Cadastre e ative um fornecedor antes de confirmar.
                </span>
              ) : null}
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Data do pedido{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <input
                name="order_date"
                type="date"
                required
                value={sameDraft && orderDate ? orderDate : document.orderDate}
                onChange={(event) => {
                  setDraftHash(state.hash);
                  setOrderDate(event.target.value);
                }}
                className="h-10 rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Observação{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
              <input
                name="notes"
                maxLength={1000}
                value={sameDraft ? notes : ""}
                onChange={(event) => {
                  setDraftHash(state.hash);
                  setNotes(event.target.value);
                }}
                placeholder={`Importado da NF-e nº ${document.invoiceNumber}, série ${document.invoiceSeries}.`}
                className="h-10 rounded-lg border bg-background px-3 font-normal"
              />
            </label>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">Revisão e mapeamento dos itens</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Associe cada item a um produto ativo de{" "}
                {sector === "laboratorio" ? "Laboratório" : "Farmácia"}.
                Quantidade aceita até 3 casas e preço até 2 casas decimais.
              </p>
            </div>
            {!sectorProducts.length ? (
              <div className="rounded-xl border border-dashed bg-card p-5 text-sm">
                Nenhum produto ativo disponível neste setor. Cadastre primeiro
                um produto para cada item.
                {sector ? (
                  <Link
                    className="ml-2 underline"
                    href={`/financeiro/${sector}/produtos`}
                  >
                    Abrir produtos{" "}
                    <ArrowRight className="inline size-3" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            ) : null}
            <input type="hidden" name="preview_hash" value={state.hash} />
            <input type="hidden" name="items" value={itemsJson} />
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <caption className="sr-only">
                  Itens lidos do XML e dados revisáveis para o pedido
                </caption>
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-3">
                      Item / código
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Descrição original / unidade
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Produto cadastrado
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Quantidade
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Valor unitário
                    </th>
                    <th scope="col" className="px-3 py-3">
                      vProd original
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {document.items.map((item) => {
                    const computed = lineTotal(item.quantity, item.unitPrice);
                    const reportedCents = amountToCents(item.productTotal);
                    const productDiverges =
                      computed.cents === null || reportedCents === null
                        ? false
                        : computed.cents !== reportedCents;
                    return (
                      <tr key={item.itemNumber}>
                        <td className="px-3 py-3 font-medium">
                          {item.itemNumber}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {item.supplierCode || "Sem cProd"}
                          </span>
                        </td>
                        <td className="max-w-64 px-3 py-3">
                          {item.description}
                          <span className="block text-xs text-muted-foreground">
                            Unidade: {item.unit || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <label
                            className="sr-only"
                            htmlFor={`product-${item.itemNumber}`}
                          >
                            Produto para o item {item.itemNumber}
                          </label>
                          <select
                            id={`product-${item.itemNumber}`}
                            required
                            value={
                              sameDraft
                                ? (mappedProducts[item.itemNumber] ?? "")
                                : ""
                            }
                            onChange={(event) => {
                              setDraftHash(state.hash);
                              setMappedProducts((current) => ({
                                ...current,
                                [item.itemNumber]: event.target.value,
                              }));
                            }}
                            className="h-10 max-w-64 rounded-lg border bg-background px-2 font-normal"
                          >
                            <option value="" disabled>
                              Selecione
                            </option>
                            {sectorProducts.map((product) => (
                              <option
                                key={product.id}
                                value={product.id}
                                disabled={
                                  usedProductIds.has(product.id) &&
                                  mappedProducts[item.itemNumber] !== product.id
                                }
                              >
                                {product.name} — {product.presentation}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <label
                            className="sr-only"
                            htmlFor={`quantity-${item.itemNumber}`}
                          >
                            Quantidade revisada do item {item.itemNumber}
                          </label>
                          <input
                            id={`quantity-${item.itemNumber}`}
                            inputMode="decimal"
                            required
                            value={
                              sameDraft
                                ? (quantities[item.itemNumber] ?? item.quantity)
                                : item.quantity
                            }
                            onChange={(event) => {
                              setDraftHash(state.hash);
                              setQuantities((current) => ({
                                ...current,
                                [item.itemNumber]: event.target.value,
                              }));
                            }}
                            className="h-10 w-28 rounded-lg border bg-background px-2"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <label
                            className="sr-only"
                            htmlFor={`price-${item.itemNumber}`}
                          >
                            Valor unitário revisado do item {item.itemNumber}
                          </label>
                          <input
                            id={`price-${item.itemNumber}`}
                            inputMode="decimal"
                            required
                            value={
                              sameDraft
                                ? (unitPrices[item.itemNumber] ??
                                  item.unitPrice)
                                : item.unitPrice
                            }
                            onChange={(event) => {
                              setDraftHash(state.hash);
                              setUnitPrices((current) => ({
                                ...current,
                                [item.itemNumber]: event.target.value,
                              }));
                            }}
                            className="h-10 w-28 rounded-lg border bg-background px-2"
                          />
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {money(item.productTotal)}
                          {!/^\d{1,9}(?:[.,]\d{1,3})?$/.test(item.quantity) ? (
                            <span className="mt-1 block text-xs text-amber-800">
                              Quantidade excede a precisão permitida; revise
                              antes de confirmar.
                            </span>
                          ) : null}
                          {!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(
                            item.unitPrice,
                          ) ? (
                            <span className="mt-1 block text-xs text-amber-800">
                              Preço excede a precisão permitida; revise antes de
                              confirmar.
                            </span>
                          ) : null}
                          {productDiverges ? (
                            <span className="mt-1 block text-xs text-amber-800">
                              Diverge de qCom × vUnCom ({computed.display})
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Total informado na NF-e
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {money(document.invoiceTotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total dos itens revisados do pedido
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {orderItemsTotalCents === null
                  ? "Revise quantidade e preço para calcular"
                  : formatCents(orderItemsTotalCents)}
              </p>
            </div>
          </section>
          {totalsDiffer ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Os totais divergem. A NF-e pode incluir descontos, frete, tributos
              e outras despesas; a diferença é informativa e não bloqueia a
              importação.
            </p>
          ) : null}
          <Button
            type="button"
            disabled={
              state.duplicate ||
              !selectedFile ||
              selectedFile.size > MAX_XML_SIZE ||
              selectedFileHash !== state.hash ||
              !supplierId ||
              !sector ||
              !sectorProducts.length ||
              confirmPending
            }
            onClick={() => {
              if (!formRef.current || !selectedFile) return;
              const formData = new FormData(formRef.current);
              formData.set("xml", selectedFile, selectedFile.name);
              startTransition(() => {
                void confirmFiscalImportAction(formData);
              });
            }}
          >
            {confirmPending
              ? "Confirmando…"
              : "Confirmar importação e criar pedido"}
          </Button>
        </>
      ) : null}
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-medium">{value}</p>
    </div>
  );
}

function lineTotal(
  quantity: string,
  price: string,
): { cents: bigint | null; display: string } {
  const decimalParts = (value: string) => {
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return { value: BigInt(`${whole}${fraction}`), scale: fraction.length };
  };
  try {
    const q = decimalParts(quantity);
    const p = decimalParts(price);
    const raw = q.value * p.value;
    const scale = q.scale + p.scale;
    const divisor = BigInt(10) ** BigInt(Math.max(0, scale - 2));
    const cents =
      scale <= 2
        ? raw * BigInt(10) ** BigInt(2 - scale)
        : (raw + divisor / BigInt(2)) / divisor;
    return {
      cents,
      display: `R$ ${cents / BigInt(100)},${(cents % BigInt(100)).toString().padStart(2, "0")}`,
    };
  } catch {
    return { cents: null, display: "não calculado" };
  }
}

function amountToCents(value: string): bigint | null {
  try {
    const [whole, fraction = ""] = value.split(".");
    const raw = BigInt(`${whole}${fraction}`);
    if (fraction.length <= 2)
      return raw * BigInt(10) ** BigInt(2 - fraction.length);
    const divisor = BigInt(10) ** BigInt(fraction.length - 2);
    return (raw + divisor / BigInt(2)) / divisor;
  } catch {
    return null;
  }
}

function formatCents(cents: bigint): string {
  return `R$ ${cents / BigInt(100)},${(cents % BigInt(100))
    .toString()
    .padStart(2, "0")}`;
}
