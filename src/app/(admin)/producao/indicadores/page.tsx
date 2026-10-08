import { ProductionIndicatorDashboard } from "@/modules/production/indicators/dashboard";
import { loadProductionIndicatorSource } from "@/modules/production/repository";
import { parseProductionIndicatorFilters } from "@/modules/production/indicators/validation";
import {
  findProductionSourceOption,
  normalizeProductionSource,
} from "@/modules/production/indicators/domain";

type ProductionIndicatorsPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ProductionIndicatorsPage({
  searchParams,
}: ProductionIndicatorsPageProps) {
  const parsed = parseProductionIndicatorFilters(await searchParams);
  const source = await loadProductionIndicatorSource();
  let filters = parsed.filters;
  let filterError = parsed.error;
  const sources = [
    ...new Map(
      source.entries.map((entry) => [
        normalizeProductionSource(entry.source),
        entry.source,
      ]),
    ).values(),
  ].sort((left, right) => left.localeCompare(right, "pt-BR"));

  if (
    filters.categoryId &&
    !source.categories.some((category) => category.id === filters.categoryId)
  ) {
    filterError ??= "A categoria selecionada não existe mais.";
    filters = { ...filters, categoryId: "" };
  }
  const selectedProcedure = source.procedures.find(
    (procedure) => procedure.id === filters.procedureId,
  );
  if (filters.procedureId && !selectedProcedure) {
    filterError ??= "O procedimento selecionado não existe mais.";
    filters = { ...filters, procedureId: "" };
  } else if (
    selectedProcedure &&
    filters.categoryId &&
    selectedProcedure.category_id !== filters.categoryId
  ) {
    filterError ??= "O procedimento não pertence à categoria selecionada.";
    filters = { ...filters, procedureId: "" };
  }
  if (filters.source) {
    const selectedSource = findProductionSourceOption(sources, filters.source);
    if (selectedSource) {
      filters = { ...filters, source: selectedSource };
    } else {
      filterError ??= "A origem selecionada não possui registros disponíveis.";
      filters = { ...filters, source: "" };
    }
  }

  return (
    <ProductionIndicatorDashboard
      filters={filters}
      filterError={filterError}
      categories={source.categories}
      procedures={source.procedures}
      entries={source.entries}
      sources={sources}
    />
  );
}
