"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import type {
  ProcedureCategory,
  ProductionEntry,
  ProductionProcedure,
} from "./domain";
import {
  createCategoryAction,
  createProcedureAction,
  createProductionEntryAction,
  setCategoryStatusAction,
  setProcedureStatusAction,
  updateCategoryAction,
  updateProcedureAction,
  updateProductionEntryAction,
} from "./actions";
import {
  initialProductionActionState,
  type ProductionActionState,
} from "./action-state";
import { formatProductionCompetence } from "./domain";

function ActionFeedback({ state }: { state: ProductionActionState }) {
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

export function CategoryManagement({
  categories,
}: {
  categories: readonly ProcedureCategory[];
}) {
  const [state, action, pending] = useActionState(
    createCategoryAction,
    initialProductionActionState,
  );
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <form
        action={action}
        className="grid content-start gap-4 rounded-xl border bg-card p-5"
      >
        <div>
          <h2 className="font-semibold">Nova categoria</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize procedimentos por área de atendimento.
          </p>
        </div>
        <label
          className="grid gap-1.5 text-sm font-medium"
          htmlFor="category-name"
        >
          Nome{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <input
            id="category-name"
            name="name"
            required
            maxLength={120}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Cadastrar categoria"}
          </Button>
          <ActionFeedback state={state} />
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Categorias cadastradas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A categoria precisa estar sem procedimentos ativos para ser
            inativada.
          </p>
        </div>
        {categories.length ? (
          <ul className="divide-y">
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </p>
        )}
      </div>
    </section>
  );
}

function CategoryRow({ category }: { category: ProcedureCategory }) {
  const [editState, editAction, editPending] = useActionState(
    updateCategoryAction,
    initialProductionActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setCategoryStatusAction,
    initialProductionActionState,
  );
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{category.name}</span>
          <StatusBadge
            label={category.active ? "Ativa" : "Inativa"}
            tone={category.active ? "success" : "neutral"}
          />
        </div>
        <details>
          <summary className="w-fit cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Editar nome
          </summary>
          <form
            action={editAction}
            className="mt-3 grid max-w-lg gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_auto]"
          >
            <input type="hidden" name="id" value={category.id} />
            <label className="grid gap-1 text-xs font-medium">
              Nome
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={category.name}
                className="h-9 rounded-md border px-2 text-sm font-normal"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              className="self-end"
              disabled={editPending}
            >
              {editPending ? "Salvando…" : "Salvar"}
            </Button>
            <div className="sm:col-span-2">
              <ActionFeedback state={editState} />
            </div>
          </form>
        </details>
        <ActionFeedback state={statusState} />
      </div>
      <form action={statusAction}>
        <input type="hidden" name="id" value={category.id} />
        <input type="hidden" name="active" value={String(!category.active)} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={statusPending}
        >
          {category.active ? "Inativar" : "Reativar"}
        </Button>
      </form>
    </li>
  );
}

export function ProcedureCreateForm({
  categories,
}: {
  categories: readonly ProcedureCategory[];
}) {
  const [state, action, pending] = useActionState(
    createProcedureAction,
    initialProductionActionState,
  );
  const activeCategories = categories.filter((category) => category.active);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="sm:col-span-2 xl:col-span-4">
        <h2 className="font-semibold">Cadastrar procedimento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada procedimento mantém sua própria unidade de contagem.
        </p>
      </div>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="procedure-category"
      >
        Categoria{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <select
          id="procedure-category"
          name="category_id"
          required
          disabled={!activeCategories.length}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        >
          <option value="">Selecione</option>
          {activeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="procedure-name"
      >
        Nome{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          id="procedure-name"
          name="name"
          required
          maxLength={160}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="counting-unit"
      >
        Unidade de contagem{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          id="counting-unit"
          name="counting_unit"
          required
          maxLength={40}
          placeholder="Ex.: exame"
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="submit" disabled={pending || !activeCategories.length}>
          {pending ? "Salvando…" : "Cadastrar"}
        </Button>
        <ActionFeedback state={state} />
      </div>
      {!activeCategories.length ? (
        <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
          Cadastre e ative uma categoria antes de adicionar procedimentos.
        </p>
      ) : null}
    </form>
  );
}

export function ProcedureList({
  procedures,
  categories,
}: {
  procedures: readonly ProductionProcedure[];
  categories: readonly ProcedureCategory[];
}) {
  if (!procedures.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <h2 className="font-semibold">Nenhum procedimento encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros ou cadastre um procedimento.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Procedimento
              </th>
              <th scope="col" className="px-4 py-3">
                Categoria
              </th>
              <th scope="col" className="px-4 py-3">
                Unidade
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
            {procedures.map((procedure) => (
              <ProcedureRow
                key={procedure.id}
                procedure={procedure}
                categories={categories}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcedureRow({
  procedure,
  categories,
}: {
  procedure: ProductionProcedure;
  categories: readonly ProcedureCategory[];
}) {
  const [editState, editAction, editPending] = useActionState(
    updateProcedureAction,
    initialProductionActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setProcedureStatusAction,
    initialProductionActionState,
  );
  const activeCategories = categories.filter((category) => category.active);
  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-4 font-medium">
        {procedure.name}
      </th>
      <td className="px-4 py-4 text-muted-foreground">
        {procedure.category_name}
      </td>
      <td className="px-4 py-4">{procedure.counting_unit}</td>
      <td className="px-4 py-4">
        <StatusBadge
          label={procedure.active ? "Ativo" : "Inativo"}
          tone={procedure.active ? "success" : "neutral"}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <details>
            <summary className="cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Editar
            </summary>
            <form
              action={editAction}
              className="mt-3 grid min-w-64 gap-3 rounded-lg border bg-background p-3"
            >
              <input type="hidden" name="id" value={procedure.id} />
              <label className="grid gap-1 text-xs font-medium">
                Categoria
                <select
                  name="category_id"
                  required
                  defaultValue={procedure.category_id}
                  className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
                >
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Nome
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={procedure.name}
                  className="h-9 rounded-md border px-2 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Unidade de contagem
                <input
                  name="counting_unit"
                  required
                  maxLength={40}
                  defaultValue={procedure.counting_unit}
                  className="h-9 rounded-md border px-2 text-sm font-normal"
                />
              </label>
              <Button type="submit" size="sm" disabled={editPending}>
                {editPending ? "Salvando…" : "Salvar alterações"}
              </Button>
              <ActionFeedback state={editState} />
            </form>
          </details>
          <form action={statusAction}>
            <input type="hidden" name="id" value={procedure.id} />
            <input
              type="hidden"
              name="active"
              value={String(!procedure.active)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={statusPending}
            >
              {procedure.active ? "Inativar" : "Reativar"}
            </Button>
          </form>
        </div>
        <div className="mt-2">
          <ActionFeedback state={statusState} />
        </div>
      </td>
    </tr>
  );
}

export function ProcedureFilters({
  categories,
  categoryId,
  status,
}: {
  categories: readonly ProcedureCategory[];
  categoryId: string;
  status: string;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
    >
      <label
        className="grid gap-1 text-sm font-medium"
        htmlFor="filter-category"
      >
        Categoria
        <select
          id="filter-category"
          name="categoria"
          defaultValue={categoryId}
          className="h-9 min-w-48 rounded-md border bg-background px-3 font-normal"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="filter-status">
        Status
        <select
          id="filter-status"
          name="status"
          defaultValue={status}
          className="h-9 min-w-36 rounded-md border bg-background px-3 font-normal"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </label>
      <Button type="submit" variant="outline" size="sm">
        Filtrar
      </Button>
    </form>
  );
}

export function ProductionEntryCreateForm({
  procedures,
  defaultCompetence,
}: {
  procedures: readonly ProductionProcedure[];
  defaultCompetence: string;
}) {
  const [state, action, pending] = useActionState(
    createProductionEntryAction,
    initialProductionActionState,
  );
  const activeProcedures = procedures.filter((procedure) => procedure.active);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 xl:grid-cols-5"
    >
      <div className="sm:col-span-2 xl:col-span-5">
        <h2 className="font-semibold">Novo lançamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o volume agregado por competência, sem dados individualizados.
        </p>
      </div>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="entry-procedure"
      >
        Procedimento{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <select
          id="entry-procedure"
          name="procedure_id"
          required
          disabled={!activeProcedures.length}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        >
          <option value="">Selecione</option>
          {activeProcedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.category_name} · {procedure.name} (
              {procedure.counting_unit})
            </option>
          ))}
        </select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="entry-period"
      >
        Competência{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          id="entry-period"
          name="reference_period"
          type="month"
          required
          defaultValue={defaultCompetence}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="entry-quantity"
      >
        Quantidade{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          id="entry-quantity"
          name="quantity"
          type="number"
          min="0"
          max="9999999999"
          step="1"
          required
          inputMode="numeric"
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="entry-source"
      >
        Fonte{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        <input
          id="entry-source"
          name="source"
          required
          maxLength={80}
          defaultValue="manual"
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="submit" disabled={pending || !activeProcedures.length}>
          {pending ? "Salvando…" : "Registrar lançamento"}
        </Button>
        <ActionFeedback state={state} />
      </div>
      {!activeProcedures.length ? (
        <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-5">
          Cadastre e ative um procedimento antes de registrar a produção.
        </p>
      ) : null}
    </form>
  );
}

export function ProductionEntryList({
  entries,
  procedures,
}: {
  entries: readonly ProductionEntry[];
  procedures: readonly ProductionProcedure[];
}) {
  if (!entries.length)
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <h2 className="font-semibold">Nenhum lançamento encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros ou registre a produção do período.
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Competência
              </th>
              <th scope="col" className="px-4 py-3">
                Categoria
              </th>
              <th scope="col" className="px-4 py-3">
                Procedimento
              </th>
              <th scope="col" className="px-4 py-3">
                Quantidade
              </th>
              <th scope="col" className="px-4 py-3">
                Fonte
              </th>
              <th scope="col" className="px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <ProductionEntryRow
                key={entry.id}
                entry={entry}
                procedures={procedures}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductionEntryRow({
  entry,
  procedures,
}: {
  entry: ProductionEntry;
  procedures: readonly ProductionProcedure[];
}) {
  const [state, action, pending] = useActionState(
    updateProductionEntryAction,
    initialProductionActionState,
  );
  const options = procedures.filter(
    (procedure) => procedure.active || procedure.id === entry.procedure_id,
  );
  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-4 font-medium capitalize">
        {formatProductionCompetence(entry.reference_period)}
      </th>
      <td className="px-4 py-4 text-muted-foreground">{entry.category_name}</td>
      <td className="px-4 py-4">{entry.procedure_name}</td>
      <td className="px-4 py-4">
        {entry.quantity} {entry.counting_unit}
      </td>
      <td className="px-4 py-4">{entry.source}</td>
      <td className="px-4 py-4">
        <details>
          <summary className="w-fit cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Editar
          </summary>
          <form
            action={action}
            className="mt-3 grid min-w-64 gap-3 rounded-lg border bg-background p-3"
          >
            <input type="hidden" name="id" value={entry.id} />
            <label className="grid gap-1 text-xs font-medium">
              Procedimento
              <select
                name="procedure_id"
                required
                defaultValue={entry.procedure_id}
                className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
              >
                {options.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.category_name} · {procedure.name} (
                    {procedure.counting_unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Competência
              <input
                name="reference_period"
                type="month"
                required
                defaultValue={entry.reference_period.slice(0, 7)}
                className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Quantidade
              <input
                name="quantity"
                type="number"
                min="0"
                max="9999999999"
                step="1"
                required
                defaultValue={entry.quantity}
                className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Fonte
              <input
                name="source"
                required
                maxLength={80}
                defaultValue={entry.source}
                className="h-9 rounded-md border bg-background px-2 text-sm font-normal"
              />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
            <ActionFeedback state={state} />
          </form>
        </details>
      </td>
    </tr>
  );
}

export function ProductionEntryFilters({
  procedures,
  procedureId,
  from,
  to,
}: {
  procedures: readonly ProductionProcedure[];
  procedureId: string;
  from: string;
  to: string;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
    >
      <label
        className="grid gap-1 text-sm font-medium"
        htmlFor="filter-entry-procedure"
      >
        Procedimento
        <select
          id="filter-entry-procedure"
          name="procedimento"
          defaultValue={procedureId}
          className="h-9 min-w-56 rounded-md border bg-background px-3 font-normal"
        >
          <option value="">Todos</option>
          {procedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.category_name} · {procedure.name}
            </option>
          ))}
        </select>
      </label>
      <label
        className="grid gap-1 text-sm font-medium"
        htmlFor="filter-entry-from"
      >
        De
        <input
          id="filter-entry-from"
          type="month"
          name="de"
          defaultValue={from}
          className="h-9 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1 text-sm font-medium"
        htmlFor="filter-entry-to"
      >
        Até
        <input
          id="filter-entry-to"
          type="month"
          name="ate"
          defaultValue={to}
          className="h-9 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <Button type="submit" variant="outline" size="sm">
        Filtrar
      </Button>
    </form>
  );
}
