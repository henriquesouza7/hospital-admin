import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProcedureCategory, ProductionProcedure } from "../domain";
import type { ProductionIndicatorFilters } from "./validation";

type IndicatorFilterFormProps = Readonly<{
  filters: ProductionIndicatorFilters;
  categories: readonly ProcedureCategory[];
  procedures: readonly ProductionProcedure[];
  sources: readonly string[];
}>;

export function IndicatorFilterForm({
  filters,
  categories,
  procedures,
  sources,
}: IndicatorFilterFormProps) {
  return (
    <form
      method="get"
      className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Filtros dos indicadores de produção"
    >
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-mode"
      >
        Período
        <select
          id="indicator-mode"
          name="visao"
          defaultValue={filters.mode}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        >
          <option value="competencia">Competência</option>
          <option value="intervalo">Intervalo mensal</option>
          <option value="ano">Ano</option>
        </select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-competence"
      >
        Competência
        <input
          id="indicator-competence"
          type="month"
          name="competencia"
          defaultValue={filters.competence}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-from"
      >
        De
        <input
          id="indicator-from"
          type="month"
          name="de"
          defaultValue={filters.from}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-to"
      >
        Até
        <input
          id="indicator-to"
          type="month"
          name="ate"
          defaultValue={filters.to}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-year"
      >
        Ano
        <input
          id="indicator-year"
          type="number"
          name="ano"
          min="1900"
          max="2099"
          defaultValue={filters.year}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-category"
      >
        Categoria
        <select
          id="indicator-category"
          name="categoria"
          defaultValue={filters.categoryId}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.active ? "" : " · inativa"}
            </option>
          ))}
        </select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-procedure"
      >
        Procedimento
        <select
          id="indicator-procedure"
          name="procedimento"
          defaultValue={filters.procedureId}
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
        >
          <option value="">Todos</option>
          {procedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.category_name} · {procedure.name} (
              {procedure.counting_unit}){procedure.active ? "" : " · inativo"}
            </option>
          ))}
        </select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-source"
      >
        Origem / tipo de registro
        <select
          id="indicator-source"
          name="origem"
          defaultValue={filters.source}
          className="h-10 rounded-md border bg-background px-3 font-normal"
        >
          <option value="">Todas, sem somar origens</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-5 text-muted-foreground sm:col-span-2 lg:col-span-4">
        Somente o período selecionado é aplicado. Competências, intervalos,
        anos, procedimentos, unidades e origens permanecem identificados nos
        resultados.
      </p>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit">Aplicar filtros</Button>
        <Link
          href="/producao/indicadores"
          className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
