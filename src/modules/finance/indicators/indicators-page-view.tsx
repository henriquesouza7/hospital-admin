import Link from "next/link";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  PackageSearch,
  TrendingUp,
} from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/modules/finance/pharmacy/format";
import { currencyChartScale, currencyChartValue } from "./domain";
import type {
  IndicatorsData,
  IndicatorPurchase,
  PriceChange,
  PriceGroup,
  SavingsOpportunity,
} from "./domain";
import { MonthlyChart } from "./monthly-chart";
import type { IndicatorsFilters } from "./validation";

type ProductChoice = Readonly<{
  id: string;
  sector: "farmacia" | "laboratorio";
  name: string;
  presentation: string;
  is_active: boolean;
}>;

function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, number - 1, 1)));
}

function percent(value: bigint | null): string {
  if (value === null) return "Indisponível (preço anterior igual a zero)";
  const absolute = value < BigInt(0) ? -value : value;
  const sign = value > BigInt(0) ? "+" : value < BigInt(0) ? "−" : "";
  return `${sign}${absolute / BigInt(100)},${(absolute % BigInt(100)).toString().padStart(2, "0")}%`;
}

function signedCurrency(value: bigint): string {
  const sign = value > BigInt(0) ? "+" : value < BigInt(0) ? "−" : "";
  return `${sign}${formatCurrency(value < BigInt(0) ? -value : value)}`;
}

function sectorLabel(sector: "farmacia" | "laboratorio") {
  return sector === "farmacia" ? "Farmácia" : "Laboratório";
}

export function IndicatorsPageView({
  filters,
  data,
  products,
  groups,
  selectedHistory,
  increases,
  opportunities,
  savingsTotal,
  filterError,
}: {
  filters: IndicatorsFilters;
  data: IndicatorsData;
  products: readonly ProductChoice[];
  groups: readonly PriceGroup[];
  selectedHistory: readonly IndicatorPurchase[];
  increases: readonly PriceChange[];
  opportunities: readonly SavingsOpportunity[];
  savingsTotal: bigint;
  filterError?: string;
}) {
  const availableProducts = products.filter(
    (product) => filters.setor === "todos" || product.sector === filters.setor,
  );
  const chartScale = currencyChartScale(
    data.monthly.flatMap((month) => [
      month.pharmacyCents,
      month.laboratoryCents,
      month.fairCents,
      month.totalCents,
    ]),
  );
  const points = data.monthly.map((month) => ({
    month: month.month,
    label: monthLabel(month.month),
    pharmacy: currencyChartValue(month.pharmacyCents, chartScale),
    pharmacyExact: formatCurrency(month.pharmacyCents),
    laboratory: currencyChartValue(month.laboratoryCents, chartScale),
    laboratoryExact: formatCurrency(month.laboratoryCents),
    fair: currencyChartValue(month.fairCents, chartScale),
    fairExact: formatCurrency(month.fairCents),
    total: currencyChartValue(month.totalCents, chartScale),
    totalExact: formatCurrency(month.totalCents),
    hasRecords: month.hasRecords,
  }));
  const selectedProduct = products.find(
    (product) =>
      product.id === filters.produto &&
      availableProducts.some((candidate) => candidate.id === product.id),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Indicadores e comparativos"
        description="Análises derivadas dos pedidos e dos totais mensais já registrados."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/financeiro" />}
          >
            <ArrowLeft aria-hidden="true" />
            Financeiro
          </Button>
        }
      />

      <form
        action="/financeiro/indicadores"
        method="get"
        className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto] lg:items-end"
      >
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="inicio">
          Início
          <input
            id="inicio"
            name="inicio"
            type="month"
            required
            defaultValue={filters.inicio}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="fim">
          Fim
          <input
            id="fim"
            name="fim"
            type="month"
            required
            defaultValue={filters.fim}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="setor">
          Setor
          <select
            id="setor"
            name="setor"
            defaultValue={filters.setor}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          >
            <option value="todos">Todos</option>
            <option value="farmacia">Farmácia</option>
            <option value="laboratorio">Laboratório</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="produto">
          Produto para histórico
          <select
            id="produto"
            name="produto"
            defaultValue={selectedProduct?.id ?? ""}
            className="h-10 min-w-0 rounded-lg border bg-background px-3 font-normal"
          >
            <option value="">Selecione um produto</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {sectorLabel(product.sector)} · {product.name} —{" "}
                {product.presentation}
                {product.is_active ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-10">
          Aplicar
        </Button>
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">
          Período padrão: últimos 12 meses, incluindo o mês atual. Limite: 24
          meses por consulta.
        </p>
      </form>
      {filterError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {filterError} Exibindo o período padrão válido.
        </p>
      ) : null}

      <section aria-labelledby="overview-title" className="space-y-4">
        <div>
          <h2 id="overview-title" className="text-lg font-semibold">
            Visão consolidada
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compras são somadas por data do pedido; Feira usa a competência
            mensal.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Financeiro"
            value={formatCurrency(data.totalCents)}
            detail="Soma dos três setores no período"
            icon={ChartNoAxesCombined}
          />
          <KpiCard
            label="Farmácia"
            value={formatCurrency(data.pharmacyCents)}
            detail={
              data.pharmacyItemCount === 0
                ? "Sem registros no período"
                : `${data.pharmacyItemCount} itens em pedidos`
            }
            icon={PackageSearch}
          />
          <KpiCard
            label="Laboratório"
            value={formatCurrency(data.laboratoryCents)}
            detail={
              data.laboratoryItemCount === 0
                ? "Sem registros no período"
                : `${data.laboratoryItemCount} itens em pedidos`
            }
            icon={PackageSearch}
          />
          <KpiCard
            label="Feira"
            value={formatCurrency(data.fairCents)}
            detail={
              data.fairExpenses.length === 0
                ? "Sem registros no período"
                : `${data.fairExpenses.length} competências com registro`
            }
            icon={PackageSearch}
          />
        </div>
      </section>

      <ChartCard
        title="Evolução mensal"
        description="Meses sem registros aparecem com zero apenas na série; isso não afirma ausência de gastos."
        badge="Período consultado"
      >
        <MonthlyChart points={points} scale={chartScale.toString()} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">
              Valores mensais de Farmácia, Laboratório, Feira e total
            </caption>
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Mês</th>
                <th className="py-2 pr-3 font-medium">Farmácia</th>
                <th className="py-2 pr-3 font-medium">Laboratório</th>
                <th className="py-2 pr-3 font-medium">Feira</th>
                <th className="py-2 pr-3 font-medium">Total</th>
                <th className="py-2 font-medium">Registros</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((month) => (
                <tr key={month.month} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {monthLabel(month.month)}
                  </th>
                  <td className="py-2 pr-3">
                    {formatCurrency(month.pharmacyCents)}
                    {!month.hasPharmacyRecords ? (
                      <span className="block text-xs text-muted-foreground">
                        Sem registros
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    {formatCurrency(month.laboratoryCents)}
                    {!month.hasLaboratoryRecords ? (
                      <span className="block text-xs text-muted-foreground">
                        Sem registros
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    {formatCurrency(month.fairCents)}
                    {!month.hasFairRecords ? (
                      <span className="block text-xs text-muted-foreground">
                        Sem registros
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 font-medium">
                    {formatCurrency(month.totalCents)}
                  </td>
                  <td className="py-2">
                    {month.hasRecords ? "Com registros" : "Sem registros"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <section className="space-y-4" aria-labelledby="history-title">
        <div>
          <h2 id="history-title" className="text-lg font-semibold">
            Histórico de preços
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados históricos usam nome, categoria e apresentação preservados no
            item do pedido.
          </p>
        </div>
        {!selectedProduct ? (
          <EmptyState
            title="Selecione um produto"
            description="Escolha Farmácia ou Laboratório e um produto para consultar as compras dentro do período."
            icon={PackageSearch}
          />
        ) : selectedHistory.length === 0 ? (
          <EmptyState
            title="Sem compras no período"
            description="Este produto não possui itens registrados no intervalo selecionado. Produtos inativos continuam disponíveis para consultar períodos antigos."
            icon={PackageSearch}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <caption className="sr-only">
                Histórico de preços de {selectedProduct.name}
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Data",
                    "Fornecedor",
                    "Nome histórico",
                    "Apresentação histórica",
                    "Categoria histórica",
                    "Quantidade",
                    "Valor unitário",
                    "Subtotal",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedHistory.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(item.orderDate)}
                    </td>
                    <td className="px-4 py-3">{item.supplierName}</td>
                    <td className="px-4 py-3">{item.productName}</td>
                    <td className="px-4 py-3">{item.presentation}</td>
                    <td className="px-4 py-3">{item.category ?? "—"}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="supplier-title">
        <div>
          <h2 id="supplier-title" className="text-lg font-semibold">
            Melhores preços observados no período
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparações agrupadas pelo produto e pela apresentação histórica
            após trim e case folding. Valores são históricos.
          </p>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            title="Sem histórico comparável"
            description="Não há itens de compra para os setores e período selecionados."
            icon={TrendingUp}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">
                Comparação de preços por produto e apresentação equivalentes
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Setor",
                    "Produto",
                    "Apresentação histórica",
                    "Fornecedores",
                    "Melhor preço observado",
                    "Maior preço",
                    "Amplitude",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key} className="border-t">
                    <td className="px-4 py-3">{sectorLabel(group.sector)}</td>
                    <td className="px-4 py-3 font-medium">{group.name}</td>
                    <td className="px-4 py-3">{group.presentation}</td>
                    <td className="px-4 py-3">
                      {group.suppliers.length === 1 ? (
                        `${group.suppliers[0].name} · único observado`
                      ) : (
                        <>
                          {group.suppliers.length} distintos
                          <span className="block text-xs text-muted-foreground">
                            {group.suppliers
                              .map((supplier) => supplier.name)
                              .join(", ")}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(group.lowestUnitPriceCents)}
                      <span className="block text-xs text-muted-foreground">
                        {group.bestSupplierNames.join(", ")}
                        {group.bestSupplierNames.length > 1 ? " · empate" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(group.highestUnitPriceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(group.rangeCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Grupos com um fornecedor observado não representam comparação entre
          fornecedores e não entram no cálculo de economia potencial.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="increases-title">
        <div>
          <h2 id="increases-title" className="text-lg font-semibold">
            Maiores aumentos observados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Até 10 aumentos entre compras consecutivas da mesma apresentação
            histórica; nenhum motivo é inferido.
          </p>
        </div>
        {increases.length === 0 ? (
          <EmptyState
            title="Nenhum aumento observado"
            description="Não foram encontradas compras consecutivas equivalentes com aumento de preço neste período."
            icon={TrendingUp}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <caption className="sr-only">
                Até dez maiores aumentos observados
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Setor",
                    "Produto e apresentação",
                    "Compra anterior",
                    "Compra atual",
                    "Fornecedor anterior",
                    "Fornecedor atual",
                    "Preço anterior",
                    "Preço atual",
                    "Diferença",
                    "Variação",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {increases.map((change) => (
                  <tr
                    key={`${change.current.id}:${change.previous.id}`}
                    className="border-t"
                  >
                    <td className="px-4 py-3">
                      {sectorLabel(change.current.sector)}
                    </td>
                    <td className="px-4 py-3">
                      {change.current.productName}
                      <span className="block text-xs text-muted-foreground">
                        {change.current.presentation}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(change.previous.orderDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(change.current.orderDate)}
                    </td>
                    <td className="px-4 py-3">
                      {change.previous.supplierName}
                    </td>
                    <td className="px-4 py-3">{change.current.supplierName}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(change.previous.unitPrice)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(change.current.unitPrice)}
                    </td>
                    <td className="px-4 py-3">
                      {signedCurrency(change.differenceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {percent(change.percentageBasisPoints)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="savings-title">
        <div>
          <h2 id="savings-title" className="text-lg font-semibold">
            Economia potencial histórica
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimativa retrospectiva baseada no menor preço observado no período
            para apresentações equivalentes.
          </p>
        </div>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Oportunidade retrospectiva estimada
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCurrency(savingsTotal)}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            O menor valor pode não ter estado disponível na data de cada compra
            e não garante disponibilidade futura. O cálculo inclui somente
            grupos com pelo menos dois fornecedores distintos.
          </p>
        </article>
        {opportunities.length === 0 ? (
          <EmptyState
            title="Sem oportunidades comparáveis"
            description="Não há diferença positiva frente ao benchmark histórico em grupos com pelo menos dois fornecedores observados."
            icon={TrendingUp}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">
                Produtos com maior oportunidade retrospectiva, limitado a dez
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Setor",
                    "Produto",
                    "Apresentação",
                    "Gasto real",
                    "Benchmark histórico",
                    "Economia potencial",
                    "Fornecedores",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.map((item) => (
                  <tr key={item.key} className="border-t">
                    <td className="px-4 py-3">{sectorLabel(item.sector)}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.presentation}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.realSpendCents)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.benchmarkSpendCents)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(item.potentialSavingsCents)}
                    </td>
                    <td className="px-4 py-3">{item.suppliers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
