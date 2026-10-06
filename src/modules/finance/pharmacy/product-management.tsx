"use client";

import { useActionState } from "react";
import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  createProductAction,
  setProductStatusAction,
  updateProductAction,
} from "./actions";
import {
  initialFinanceActionState,
  type FinanceActionState,
} from "./action-state";
import type { listProducts } from "./repository";

type Product = Awaited<ReturnType<typeof listProducts>>[number];

export function ProductCreateForm() {
  const [state, action, pending] = useActionState(
    createProductAction,
    initialFinanceActionState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Cadastrar produto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O preço será registrado em cada compra para preservar o histórico.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Nome padronizado{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          name="name"
          required
          maxLength={160}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Categoria{" "}
        <span className="font-normal text-muted-foreground">(opcional)</span>
        <input
          name="category"
          maxLength={80}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Unidade ou apresentação{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          name="presentation"
          required
          maxLength={120}
          placeholder="Ex.: caixa com 20 unidades"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 self-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar produto"}
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ProductList({ products }: { products: Product[] }) {
  if (!products.length)
    return (
      <EmptyState
        icon={PackageSearch}
        title="Nenhum produto cadastrado"
        description="Cadastre os itens que poderão ser incluídos nos pedidos."
      />
    );
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Produto
              </th>
              <th scope="col" className="px-4 py-3">
                Categoria
              </th>
              <th scope="col" className="px-4 py-3">
                Unidade/apresentação
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [state, action, pending] = useActionState(
    updateProductAction,
    initialFinanceActionState,
  );
  return (
    <tr className="align-top">
      <td className="px-4 py-4 font-medium">{product.name}</td>
      <td className="px-4 py-4 text-muted-foreground">
        {product.category || "—"}
      </td>
      <td className="px-4 py-4">{product.presentation}</td>
      <td className="px-4 py-4">
        <StatusBadge
          label={product.is_active ? "Ativo" : "Inativo"}
          tone={product.is_active ? "success" : "neutral"}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <details>
            <summary className="cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Editar
            </summary>
            <form
              action={action}
              className="mt-3 grid min-w-64 gap-3 rounded-lg border bg-background p-3"
            >
              <input type="hidden" name="id" value={product.id} />
              <label className="grid gap-1 text-xs font-medium">
                Nome
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={product.name}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Categoria
                <input
                  name="category"
                  maxLength={80}
                  defaultValue={product.category ?? ""}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Unidade/apresentação
                <input
                  name="presentation"
                  required
                  maxLength={120}
                  defaultValue={product.presentation}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal"
                />
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Salvando…" : "Salvar alterações"}
              </Button>
              <ActionMessage state={state} />
            </form>
          </details>
          <form action={setProductStatusAction}>
            <input type="hidden" name="id" value={product.id} />
            <input
              type="hidden"
              name="is_active"
              value={String(!product.is_active)}
            />
            <Button type="submit" variant="outline" size="sm">
              {product.is_active ? "Inativar" : "Ativar"}
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function ActionMessage({ state }: { state: FinanceActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "text-sm text-destructive"
          : "text-sm text-muted-foreground"
      }
    >
      {state.message}
    </p>
  );
}
