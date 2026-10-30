import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { SelectField } from "@/components/ui/select";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";
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
      className="space-y-5 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"
      aria-label="Filtros dos indicadores de produção"
    >
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Período de análise
        </legend>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
              className="h-10 w-full min-w-0 rounded-xl border border-border/80 bg-card px-3.5 text-sm font-normal shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="min-w-0 border-t border-border/70 pt-4">
        <legend className="mb-3 px-0 text-sm font-semibold text-foreground">
          Detalhamento
        </legend>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
                  {procedure.counting_unit})
                  {procedure.active ? "" : " · inativo"}
                </option>
              ))}
            </SelectField>
          </label>
          <label
            className="grid min-w-0 gap-1.5 text-sm font-medium"
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
        </div>
      </fieldset>
      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
          Somente o período selecionado é aplicado. Competências, intervalos,
          anos, procedimentos, unidades e origens permanecem identificados nos
          resultados.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="submit" className="gap-2">
            <Filter aria-hidden="true" className="size-4" />
            Aplicar filtros
          </Button>
          <Link
            href="/producao/indicadores"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Limpar filtros
          </Link>
        </div>
      </div>
    </form>
  );
}
