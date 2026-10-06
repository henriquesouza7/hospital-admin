import { IndicatorsPageView } from "@/modules/finance/indicators/indicators-page-view";
import {
  buildIndicatorsData,
  buildPriceGroups,
  calculateSavingsOpportunities,
  getHistoricalPriceHistory,
  getLargestIncreases,
} from "@/modules/finance/indicators/domain";
import { loadIndicatorsSource } from "@/modules/finance/indicators/repository";
import { parseIndicatorsFilters } from "@/modules/finance/indicators/validation";

type IndicatorsPageProps = Readonly<{
  searchParams: Promise<{
    inicio?: string | string[];
    fim?: string | string[];
    setor?: string | string[];
    produto?: string | string[];
  }>;
}>;

export default async function IndicatorsPage({
  searchParams,
}: IndicatorsPageProps) {
  const parsedFilters = parseIndicatorsFilters(await searchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : parsedFilters.fallback;
  const source = await loadIndicatorsSource(filters.inicio, filters.fim);
  const data = buildIndicatorsData(
    filters,
    source.purchases,
    source.fairExpenses,
  );
  const groups = buildPriceGroups(data.purchases);
  const opportunities = calculateSavingsOpportunities(data.purchases);
  const selectedProductId =
    filters.produto &&
    source.products.some(
      (product) =>
        product.id === filters.produto &&
        (filters.setor === "todos" || product.sector === filters.setor),
    )
      ? filters.produto
      : "";

  return (
    <IndicatorsPageView
      filters={{ ...filters, produto: selectedProductId }}
      data={data}
      products={source.products}
      groups={groups}
      selectedHistory={
        selectedProductId
          ? getHistoricalPriceHistory(data.purchases, selectedProductId)
          : []
      }
      increases={getLargestIncreases(data.purchases)}
      opportunities={opportunities.slice(0, 10)}
      savingsTotal={opportunities.reduce(
        (total, item) => total + item.potentialSavingsCents,
        BigInt(0),
      )}
      filterError={parsedFilters.success ? undefined : parsedFilters.message}
    />
  );
}
