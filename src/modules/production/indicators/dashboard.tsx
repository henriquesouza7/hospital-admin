import { Activity, ClipboardList, Layers3 } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import type { ProcedureCategory, ProductionProcedure } from "../domain";
import { buildProductionIndicatorData } from "./domain";
import type { ProductionIndicatorEntry } from "../repository";
import {
  ComparisonCharts,
  MonthlyEvolutionCharts,
  TopProcedureCharts,
} from "./indicator-charts";
import { IndicatorFilterForm } from "./filter-form";
import type { ProductionIndicatorFilters } from "./validation";

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

type ProductionIndicatorDashboardProps = Readonly<{
  filters: ProductionIndicatorFilters;
  filterError?: string;
  categories: readonly ProcedureCategory[];
  procedures: readonly ProductionProcedure[];
  entries: readonly ProductionIndicatorEntry[];
  sources: readonly string[];
}>;

export function ProductionIndicatorDashboard({
  filters,
  filterError,
  categories,
  procedures,
  entries,
  sources,
}: ProductionIndicatorDashboardProps) {
  const data = buildProductionIndicatorData(entries, filters);
  const selectedProcedure = procedures.find(
    (procedure) => procedure.id === filters.procedureId,
  );
  const selectedPeriodLabel = getPeriodLabel(filters);
  const categoryCount = new Set(
    data.periodEntries.map((entry) => entry.category_id),
  ).size;

  const monthlyComparisons = data.comparisons.monthOverMonth;
  const equivalentComparisons = data.comparisons.equivalentCompetence;
  const annualComparisons = data.comparisons.yearOverYear;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Produção · Fase 5"
        title="Indicadores de produção"
        description="Volumes administrativos derivados dos lançamentos persistidos. Quantidade registrada não mede qualidade clínica."
      />

      {filterError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Filtros inválidos: {filterError} Exibindo os valores padrão seguros.
        </p>
      ) : null}

      <IndicatorFilterForm
        filters={filters}
        categories={categories}
        procedures={procedures}
        sources={sources}
      />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Resumo do recorte"
      >
        <KpiCard
          label="Lançamentos no recorte"
          value={numberFormat.format(data.recordCount)}
          detail={`Registros persistidos em ${selectedPeriodLabel}; zero registrado é mantido como zero.`}
          icon={ClipboardList}
        />
        <KpiCard
          label="Procedimentos com registros"
          value={numberFormat.format(data.procedureCount)}
          detail="Contagem distinta; não soma quantidades de procedimentos diferentes."
          icon={Activity}
        />
        <KpiCard
          label="Categorias com registros"
          value={numberFormat.format(categoryCount)}
          detail="Categorias são grupos de navegação; seus procedimentos não são totalizados entre si."
          icon={Layers3}
        />
      </section>

      {filters.mode === "competencia" && selectedProcedure ? (
        <section
          className="space-y-4"
          aria-labelledby="competence-quantity-title"
        >
          <div>
            <h2
              id="competence-quantity-title"
              className="text-lg font-semibold"
            >
              Quantidade registrada na competência
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedProcedure.category_name} · {selectedProcedure.name} ·{" "}
              {selectedPeriodLabel}. Cada cartão mantém a unidade histórica e a
              origem do lançamento.
            </p>
          </div>
          {data.volumeRanking.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.volumeRanking.map((volume) => (
                <KpiCard
                  key={volume.key}
                  label={`Quantidade · ${volume.source}`}
                  value={numberFormat.format(volume.quantity)}
                  detail={`${volume.procedureName} · ${volume.countingUnit} · ${selectedPeriodLabel} · ${volume.recordCount} lançamento(s)`}
                  icon={Activity}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem lançamento nesta competência"
              description="Nenhum registro foi encontrado para o procedimento e os filtros selecionados. Isso não representa automaticamente quantidade zero."
              icon={ClipboardList}
            />
          )}
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="evolution-title">
        <div>
          <h2 id="evolution-title" className="text-lg font-semibold">
            Evolução mensal do procedimento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um procedimento. Cada gráfico separa unidades históricas;
            as linhas distinguem origem/tipo de registro.
          </p>
        </div>
        <MonthlyEvolutionCharts
          series={data.monthlyEvolution}
          procedureName={selectedProcedure?.name}
        />
      </section>

      {selectedProcedure && filters.mode === "competencia" ? (
        <>
          <section
            className="space-y-4"
            aria-labelledby="month-comparison-title"
          >
            <div>
              <h2 id="month-comparison-title" className="text-lg font-semibold">
                Comparação mês a mês
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compara {selectedPeriodLabel} à competência mensal imediatamente
                anterior, para o mesmo procedimento, unidade histórica e origem.
              </p>
            </div>
            <ComparisonCharts
              title="Competência atual × anterior"
              description="A comparação usa o mesmo procedimento e separa cada origem."
              currentLabel={selectedPeriodLabel}
              previousLabel={formatMonth(addMonths(filters.competence, -1))}
              procedureName={selectedProcedure.name}
              rows={monthlyComparisons}
            />
          </section>
          <section
            className="space-y-4"
            aria-labelledby="equivalent-comparison-title"
          >
            <div>
              <h2
                id="equivalent-comparison-title"
                className="text-lg font-semibold"
              >
                Competências equivalentes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compara o mesmo mês do ano selecionado e do ano anterior, sem
                misturar unidade ou origem.
              </p>
            </div>
            <ComparisonCharts
              title="Mesmo mês em anos consecutivos"
              description="Valores presentes no banco são comparados apenas no mesmo procedimento, unidade e origem."
              currentLabel={selectedPeriodLabel}
              previousLabel={formatMonth(
                `${Number(filters.competence.slice(0, 4)) - 1}-${filters.competence.slice(5, 7)}`,
              )}
              procedureName={selectedProcedure.name}
              rows={equivalentComparisons}
            />
          </section>
        </>
      ) : null}

      {selectedProcedure && filters.mode === "ano" ? (
        <section
          className="space-y-4"
          aria-labelledby="annual-comparison-title"
        >
          <div>
            <h2 id="annual-comparison-title" className="text-lg font-semibold">
              Comparação anual
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Soma mensal do mesmo procedimento, unidade histórica e origem em
              cada ano selecionado.
            </p>
          </div>
          <ComparisonCharts
            title="Ano selecionado × anterior"
            description="Só compara combinações de unidade e origem presentes em pelo menos um dos anos."
            currentLabel={filters.year}
            previousLabel={String(Number(filters.year) - 1)}
            procedureName={selectedProcedure.name}
            rows={annualComparisons}
          />
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="top-volume-title">
        <div>
          <h2 id="top-volume-title" className="text-lg font-semibold">
            Procedimentos com maior volume
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking limitado aos dez maiores resultados por procedimento,
            unidade histórica e origem dentro de cada gráfico.
          </p>
        </div>
        <TopProcedureCharts
          volumes={data.volumeRanking}
          periodLabel={selectedPeriodLabel}
        />
      </section>

      <section className="space-y-4" aria-labelledby="category-group-title">
        <div>
          <h2 id="category-group-title" className="text-lg font-semibold">
            Produção agrupada por categoria
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            As categorias organizam a leitura. Cada linha permanece específica
            por procedimento, unidade e origem; não há total agregado da
            categoria.
          </p>
        </div>
        {data.categoryGroups.length ? (
          <div className="grid gap-4">
            {data.categoryGroups.map((group) => (
              <ChartCard
                key={group.categoryId}
                title={group.categoryName}
                description={`Período: ${selectedPeriodLabel}. Volume individual por procedimento, unidade histórica e origem; sem soma entre procedimentos.`}
                badge="Agrupamento sem totalização"
              >
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <caption className="sr-only">
                      Procedimentos da categoria {group.categoryName}, por
                      competência, unidade e origem
                    </caption>
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Procedimento
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Período
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Quantidade
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Unidade histórica
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Origem / tipo
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Lançamentos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.procedures.map((volume) => (
                        <tr key={volume.key} className="border-t">
                          <th scope="row" className="px-3 py-2 font-medium">
                            {volume.procedureName}
                          </th>
                          <td className="px-3 py-2">{selectedPeriodLabel}</td>
                          <td className="px-3 py-2">
                            {numberFormat.format(volume.quantity)}
                          </td>
                          <td className="px-3 py-2">{volume.countingUnit}</td>
                          <td className="px-3 py-2">{volume.source}</td>
                          <td className="px-3 py-2">{volume.recordCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum registro para agrupar"
            description="As categorias aparecerão quando houver lançamentos dentro do período e filtros selecionados."
            icon={Layers3}
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="variation-title">
        <div>
          <h2 id="variation-title" className="text-lg font-semibold">
            Histórico de variação
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparação com o lançamento anterior disponível para a mesma origem
            e unidade histórica, sem inferir causa.
          </p>
        </div>
        {selectedProcedure && data.variations.length ? (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">
                Histórico de variações de {selectedProcedure.name}, por
                competência, unidade e origem
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Competência
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Procedimento
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Quantidade
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Unidade
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Origem
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Competência anterior
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Variação
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.variations.map((variation) => (
                  <tr key={variation.key} className="border-t">
                    <th scope="row" className="px-4 py-3 font-medium">
                      {formatMonth(variation.competence)}
                    </th>
                    <td className="px-4 py-3">{variation.procedureName}</td>
                    <td className="px-4 py-3">
                      {numberFormat.format(variation.quantity)}
                    </td>
                    <td className="px-4 py-3">{variation.countingUnit}</td>
                    <td className="px-4 py-3">{variation.source}</td>
                    <td className="px-4 py-3">
                      {variation.previousCompetence
                        ? formatMonth(variation.previousCompetence)
                        : "Sem histórico anterior"}
                    </td>
                    <td className="px-4 py-3">
                      {variation.variation === null
                        ? "Dados insuficientes"
                        : `${variation.variation > 0 ? "+" : ""}${numberFormat.format(variation.variation)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              selectedProcedure
                ? "Sem histórico para este procedimento"
                : "Selecione um procedimento"
            }
            description="O histórico de variação precisa de registros persistidos para um procedimento. A primeira competência não recebe variação calculada."
            icon={Activity}
          />
        )}
      </section>

      {data.recordCount === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Não há dados no recorte atual. A interface não preenche lacunas com
          números fictícios nem trata ausência de lançamento como zero
          registrado.
        </p>
      ) : null}
    </div>
  );
}

function getPeriodLabel(filters: ProductionIndicatorFilters): string {
  if (filters.mode === "competencia") return formatMonth(filters.competence);
  if (filters.mode === "ano") return filters.year;
  return `${formatMonth(filters.from)} a ${formatMonth(filters.to)}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
