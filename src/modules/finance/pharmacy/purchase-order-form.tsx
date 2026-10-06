"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateLineTotalCents,
  calculateOrderTotalCents,
} from "./validation";
import { createPurchaseOrderAction } from "./actions";
import type { listActiveSuppliers, listProducts } from "./repository";
import { formatCurrency } from "./format";

type Supplier = Awaited<ReturnType<typeof listActiveSuppliers>>[number];
type Product = Awaited<ReturnType<typeof listProducts>>[number];
type ItemDraft = {
  key: number;
  product_id: string;
  quantity: string;
  unit_price: string;
};

export function PurchaseOrderForm({
  suppliers,
  products,
  error,
}: {
  suppliers: Supplier[];
  products: Product[];
  error?: string;
}) {
  const [items, setItems] = useState<ItemDraft[]>([
    { key: 1, product_id: "", quantity: "1", unit_price: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const availableProductIds = new Set(
    items.map((item) => item.product_id).filter(Boolean),
  );
  const itemsJson = JSON.stringify(
    items.map(({ product_id, quantity, unit_price }) => ({
      product_id,
      quantity,
      unit_price,
    })),
  );
  const totalCents = items.reduce((sum, item) => {
    if (!item.product_id || !item.quantity || !item.unit_price) return sum;
    try {
      return (
        sum +
        calculateOrderTotalCents([
          { quantity: item.quantity, unitPrice: item.unit_price },
        ])
      );
    } catch {
      return sum;
    }
  }, BigInt(0));

  function updateItem(
    key: number,
    field: keyof Omit<ItemDraft, "key">,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  if (!suppliers.length || !products.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-10">
        <h2 className="font-semibold">Faltam dados para criar o pedido</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre e ative ao menos um fornecedor e um produto da Farmácia antes
          de iniciar uma compra.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!suppliers.length ? (
            <Button
              variant="outline"
              render={<Link href="/financeiro/farmacia/fornecedores" />}
            >
              Cadastrar fornecedor
            </Button>
          ) : null}
          {!products.length ? (
            <Button
              variant="outline"
              render={<Link href="/financeiro/farmacia/produtos" />}
            >
              Cadastrar produto
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={createPurchaseOrderAction} className="space-y-6">
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
          Fornecedor{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <select
            name="supplier_id"
            required
            defaultValue=""
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          >
            <option value="" disabled>
              Selecione um fornecedor
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Data da compra{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <input
            name="order_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
          Observação{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
          <textarea
            name="notes"
            maxLength={1000}
            rows={2}
            className="rounded-lg border bg-background px-3 py-2 font-normal"
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Itens do pedido</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O preço é salvo por compra e o subtotal é recalculado no banco.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setItems((current) => [
                ...current,
                { key: nextKey, product_id: "", quantity: "1", unit_price: "" },
              ]);
              setNextKey((key) => key + 1);
            }}
          >
            <Plus aria-hidden="true" />
            Adicionar produto
          </Button>
        </div>
        <input type="hidden" name="items" value={itemsJson} />
        <div className="space-y-3">
          {items.map((item, index) => {
            const amount = (() => {
              try {
                return formatCurrency(
                  calculateLineTotalCents(item.quantity, item.unit_price),
                );
              } catch {
                return "—";
              }
            })();
            return (
              <fieldset
                key={item.key}
                className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(12rem,2fr)_minmax(6rem,0.7fr)_minmax(8rem,0.8fr)_minmax(7rem,0.8fr)_auto] sm:items-end"
              >
                <legend className="sr-only">Item {index + 1}</legend>
                <label className="grid gap-1.5 text-sm font-medium">
                  Produto{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                  <select
                    required
                    value={item.product_id}
                    onChange={(event) =>
                      updateItem(item.key, "product_id", event.target.value)
                    }
                    className="h-10 rounded-lg border bg-background px-3 font-normal"
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                        disabled={
                          availableProductIds.has(product.id) &&
                          item.product_id !== product.id
                        }
                      >
                        {product.name} — {product.presentation}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Quantidade{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                  <input
                    required
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.key, "quantity", event.target.value)
                    }
                    className="h-10 rounded-lg border bg-background px-3 font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Valor unitário{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                  <input
                    required
                    inputMode="decimal"
                    value={item.unit_price}
                    onChange={(event) =>
                      updateItem(item.key, "unit_price", event.target.value)
                    }
                    placeholder="0,00"
                    className="h-10 rounded-lg border bg-background px-3 font-normal"
                  />
                </label>
                <div>
                  <span className="text-sm font-medium">Subtotal</span>
                  <p className="mt-2 h-10 content-center font-semibold tabular-nums">
                    {amount}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover item ${index + 1}`}
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((candidate) => candidate.key !== item.key),
                    )
                  }
                >
                  <Trash2
                    aria-hidden="true"
                    className="text-muted-foreground"
                  />
                </Button>
              </fieldset>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-xl border bg-accent/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total do pedido (prévia)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(totalCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            O valor definitivo é calculado pelo banco ao salvar.
          </p>
        </div>
        <Button type="submit">Salvar pedido</Button>
      </div>
    </form>
  );
}
