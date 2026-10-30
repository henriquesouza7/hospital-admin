import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { SelectField } from "@/components/ui/select";
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
        <SelectField
          id="indicator-mode"
          name="visao"
          defaultValue={filters.mode}
          className="w-full min-w-0"
        >
          <option value="competencia">Competência</option>
          <option value="intervalo">Intervalo mensal</option>
          <option value="ano">Ano</option>
        </SelectField>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-competence"
      >
        Competência
        <MonthYearPicker
          id="indicator-competence"
          name="competencia"
          defaultValue={filters.competence}
          className="w-full min-w-0"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-from"
      >
        De
        <MonthYearPicker
          id="indicator-from"
          name="de"
          defaultValue={filters.from}
          className="w-full min-w-0"
        />
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-to"
      >
        Até
        <MonthYearPicker
          id="indicator-to"
          name="ate"
          defaultValue={filters.to}
          className="w-full min-w-0"
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
        <SelectField
          id="indicator-category"
          name="categoria"
          defaultValue={filters.categoryId}
          className="w-full min-w-0"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.active ? "" : " · inativa"}
            </option>
          ))}
        </SelectField>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-procedure"
      >
        Procedimento
        <SelectField
          id="indicator-procedure"
          name="procedimento"
          defaultValue={filters.procedureId}
          className="w-full min-w-0"
        >
          <option value="">Todos</option>
          {procedures.map((procedure) => (
            <option key={procedure.id} value={procedure.id}>
              {procedure.category_name} · {procedure.name} (
              {procedure.counting_unit}){procedure.active ? "" : " · inativo"}
            </option>
          ))}
        </SelectField>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="indicator-source"
      >
        Origem / tipo de registro
        <SelectField
          id="indicator-source"
          name="origem"
          defaultValue={filters.source}
          className="w-full min-w-0"
        >
          <option value="">Todas, sem somar origens</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </SelectField>
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
