"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  createSupplierAction,
  setSupplierStatusAction,
  updateSupplierAction,
} from "./actions";
import {
  initialFinanceActionState,
  type FinanceActionState,
} from "./action-state";
import type { listSuppliers } from "./repository";

type Supplier = Awaited<ReturnType<typeof listSuppliers>>[number];

export function SupplierCreateForm() {
  const [state, action, pending] = useActionState(
    createSupplierAction,
    initialFinanceActionState,
  );

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Cadastrar fornecedor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe somente os dados necessários para identificar o fornecedor.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Nome{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          name="name"
          required
          maxLength={160}
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
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar fornecedor"}
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function SupplierList({ suppliers }: { suppliers: Supplier[] }) {
  if (!suppliers.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <h2 className="font-semibold">Nenhum fornecedor cadastrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um fornecedor para vinculá-lo aos pedidos de compra.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="grid gap-3 lg:grid-cols-2"
      aria-label="Fornecedores cadastrados"
    >
      {suppliers.map((supplier) => (
        <SupplierRow key={supplier.id} supplier={supplier} />
      ))}
    </ul>
  );
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const [state, action, pending] = useActionState(
    updateSupplierAction,
    initialFinanceActionState,
  );
  return (
    <li className="min-w-0 rounded-xl border bg-card p-4">
      <article className="grid gap-4">
        <header className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-foreground"
            >
              {supplier.name.trim().slice(0, 1).toLocaleUpperCase("pt-BR")}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">
                {supplier.name}
              </h3>
              {supplier.notes ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {supplier.notes}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sem observação
                </p>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${supplier.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground"}`}
          >
            {supplier.is_active ? "Ativo" : "Inativo"}
          </span>
        </header>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <details>
            <summary className="cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Editar
            </summary>
            <form
              action={action}
              className="mt-3 grid min-w-64 gap-3 rounded-lg border bg-background p-3"
            >
              <input type="hidden" name="id" value={supplier.id} />
              <label className="grid gap-1 text-xs font-medium">
                Nome
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={supplier.name}
                  className="h-9 rounded-md border px-2 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Observação
                <textarea
                  name="notes"
                  maxLength={1000}
                  rows={2}
                  defaultValue={supplier.notes ?? ""}
                  className="rounded-md border px-2 py-1 text-sm font-normal"
                />
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Salvando…" : "Salvar alterações"}
              </Button>
              <ActionMessage state={state} />
            </form>
          </details>
          <form action={setSupplierStatusAction}>
            <input type="hidden" name="id" value={supplier.id} />
            <input
              type="hidden"
              name="is_active"
              value={String(!supplier.is_active)}
            />
            <Button type="submit" variant="outline" size="sm">
              {supplier.is_active ? "Inativar" : "Ativar"}
            </Button>
          </form>
        </div>
      </article>
    </li>
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
