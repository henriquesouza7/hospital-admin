import Link from "next/link";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardPlus,
  CircleDollarSign,
  FileChartColumn,
} from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import {
  addMonthsClamped,
  parseYearMonth,
  saoPauloToday,
} from "@/modules/admissions/period";
import { summarizeAdmissionTotals } from "@/modules/admissions/domain";
import {
  getAdmissionDashboardTotals,
  listAdmissionTargets,
} from "@/modules/admissions/repository";
import { MonthlyEvolutionCharts } from "@/modules/production/indicators/indicator-charts";
import { buildProductionIndicatorData } from "@/modules/production/indicators/domain";
import { listMonthlyExpenseTotals } from "@/modules/finance/indicators/repository";
import {
  amountToCents,
  currencyChartScale,
  currencyChartValue,
} from "@/modules/finance/indicators/domain";
import { AdmissionDashboardChart } from "@/modules/admissions/admission-dashboard-chart";
import { MonthlyChart } from "@/modules/finance/indicators/monthly-chart";
import { loadProductionIndicatorSource } from "@/modules/production/repository";
import { listProductionImports } from "@/modules/production-import/repository";
import { getSurgerySummary } from "@/modules/minor-surgeries/repository";
import {
  formatCurrency,
  formatInteger,
  getProductionForMonth,
  monthName,
} from "@/modules/admin-dashboard/domain";

export const dynamic = "force-dynamic";

type HomeProps = Readonly<{
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
  }>;
}>;

export default async function Home({ searchParams }: HomeProps) {
  const period = parseYearMonth(await searchParams);
  const startDate = `${period.year}-01-01`;
  const endDate = `${period.year + 1}-01-01`;
  const competence = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const today = saoPauloToday();
  const todayDate = today.toISOString().slice(0, 10);
  const surgeryThrough = addMonthsClamped(today, 24);
  const [
    admissionTotals,
    targets,
    financeRows,
    productionSource,
    productionImports,
    surgery,
  ] = await Promise.all([
    getAdmissionDashboardTotals(startDate, endDate),
    listAdmissionTargets(startDate, endDate),
    listMonthlyExpenseTotals(`${period.year}-01`, `${period.year}-12`),
    loadProductionIndicatorSource({
      from: `${period.year}-01`,
      to: `${period.year}-12`,
    }),
    listProductionImports(3),
    getSurgerySummary(todayDate, surgeryThrough.toISOString().slice(0, 10), 5),
  ]);
  const admissions = summarizeAdmissionTotals(
    admissionTotals,
    targets,
    period.year,
    period.month,
    today,
  );
  const finance = financeRows.map((row) => {
    const pharmacyCents = amountToCents(row.pharmacy_total);
    const laboratoryCents = amountToCents(row.laboratory_total);
    const fairCents = amountToCents(row.fair_total);
    return {
      month: row.competence.slice(0, 7),
      pharmacyCents,
      laboratoryCents,
      fairCents,
      totalCents: pharmacyCents + laboratoryCents + fairCents,
      pharmacyItemCount: row.pharmacy_item_count,
      laboratoryItemCount: row.laboratory_item_count,
      hasRecords:
        row.pharmacy_item_count > 0 ||
        row.laboratory_item_count > 0 ||
        row.has_fair_record,
    };
  });
  const selectedMonth = finance.find((item) => item.month === competence);
  const production = getProductionForMonth(
    productionSource.entries,
    period.year,
    period.month,
  );
  const selectedProcedure = production[0];
  const productionHistory = selectedProcedure
    ? buildProductionIndicatorData(productionSource.entries, {
        mode: "intervalo",
        competence,
        from: `${period.year}-01`,
        to: competence,
        year: String(period.year),
        categoryId: "",
        procedureId: selectedProcedure.procedureId,
        source: "",
      }).monthlyEvolution
    : [];
  const available = Math.max(0, surgery.capacity - surgery.occupied);
  const chartScale = currencyChartScale(
    finance.flatMap((month) => [
      month.pharmacyCents,
      month.laboratoryCents,
      month.fairCents,
      month.totalCents,
    ]),
  );
  const periodLabel = `${monthName(period.month)} ${period.year}`;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Visão geral"
        title="Painel administrativo"
        description="Indicadores derivados dos registros dos módulos. Volumes e unidades permanecem separados."
        actions={
          <StatusBadge
            icon={ChartNoAxesCombined}
            label="Dados persistidos"
            tone="success"
          />
        }
      />

      <form
        method="get"
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Ano
          <input
            name="year"
            type="number"
            min="1900"
            max="2100"
            defaultValue={period.year}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <select
            name="month"
            defaultValue={period.month}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {monthName(month)}
                </option>
              ),
            )}
          </select>
        </label>
        <button
          className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
          type="submit"
        >
          Aplicar período
        </button>
      </form>

      <section className="space-y-4" aria-label="Resumo mensal">
        <SectionHeader
          title={`Resumo · ${periodLabel}`}
          description="Financeiro, internações e produção exibidos com seus critérios e unidades próprios."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={CircleDollarSign}
            label="Gastos registrados"
            value={formatCurrency(selectedMonth?.totalCents ?? BigInt(0))}
            detail={`${selectedMonth?.pharmacyItemCount ?? 0} itens de Farmácia · ${selectedMonth?.laboratoryItemCount ?? 0} de Laboratório`}
          />
          <KpiCard
            icon={CalendarDays}
            label="Internações no mês"
            value={formatInteger(admissions.monthlyTotal)}
            detail={
              admissions.monthTarget === null
                ? "Meta mensal não configurada"
                : `${formatInteger(admissions.monthTarget)} de meta mensal`
            }
          />
          <KpiCard
            icon={FileChartColumn}
            label="Séries de produção"
            value={formatInteger(production.length)}
            detail="Procedimento, origem e unidade discriminados"
          />
          <KpiCard
            icon={ClipboardPlus}
            label="Vagas disponíveis · próximos 2 anos"
            value={formatInteger(available)}
            detail={`${surgery.occupied} ocupadas · ${surgery.waiting_count} na fila`}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Evolução financeira mensal"
          description="Farmácia, Laboratório e Feira conforme registros persistidos; valores sem registros ficam em zero."
          badge="R$"
        >
          <MonthlyChart
            points={finance.map((item) => ({
              month: item.month,
              label: monthName(Number(item.month.slice(5, 7))),
              pharmacy: currencyChartValue(item.pharmacyCents, chartScale),
              pharmacyExact: formatCurrency(item.pharmacyCents),
              laboratory: currencyChartValue(item.laboratoryCents, chartScale),
              laboratoryExact: formatCurrency(item.laboratoryCents),
              fair: currencyChartValue(item.fairCents, chartScale),
              fairExact: formatCurrency(item.fairCents),
              total: currencyChartValue(item.totalCents, chartScale),
              totalExact: formatCurrency(item.totalCents),
              hasRecords: item.hasRecords,
            }))}
            scale={chartScale.toString()}
          />
          {!selectedMonth?.hasRecords ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa registrada em {periodLabel}.
            </p>
          ) : null}
        </ChartCard>
        <ChartCard
          title={`Internações por mês · ${period.year}`}
          description="Quantidade administrativa; o mês atual e os períodos encerrados são diferenciados no gráfico."
        >
          <AdmissionDashboardChart dashboard={admissions} />
          <p className="mt-3 text-sm text-muted-foreground">
            Meta mensal:{" "}
            {admissions.monthTarget === null
              ? "não configurada"
              : formatInteger(admissions.monthTarget)}
            {admissions.monthTarget && admissions.monthTarget > 0
              ? ` · ${Math.round((admissions.monthlyTotal / admissions.monthTarget) * 100)}% realizado`
              : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total anual: {formatInteger(admissions.annualTotal)} · meta anual:{" "}
            {admissions.yearTarget === null
              ? "não configurada"
              : formatInteger(admissions.yearTarget)}
            {admissions.yearTarget && admissions.yearTarget > 0
              ? ` · ${Math.round((admissions.annualTotal / admissions.yearTarget) * 100)}% realizado`
              : ""}
          </p>
        </ChartCard>
      </section>

      <section className="space-y-4" aria-label="Resumo financeiro por área">
        <SectionHeader
          title={`Despesas por área · ${periodLabel}`}
          description="Totais derivados dos mesmos registros financeiros apresentados na evolução mensal."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Farmácia", value: selectedMonth?.pharmacyCents },
            { label: "Laboratório", value: selectedMonth?.laboratoryCents },
            { label: "Feira", value: selectedMonth?.fairCents },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold">
                {formatCurrency(item.value ?? BigInt(0))}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Produção por procedimento"
            description={`Competência ${periodLabel}; classificações e unidades permanecem separadas.`}
          />
          {production.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Sem lançamentos nesta competência.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 font-medium">Procedimento</th>
                    <th className="py-2 font-medium">Classificação</th>
                    <th className="py-2 font-medium">Quantidade</th>
                    <th className="py-2 font-medium">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {production.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3">{item.source}</td>
                      <td className="py-3">{formatInteger(item.quantity)}</td>
                      <td className="py-3">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Evolução da produção"
            description={
              selectedProcedure
                ? `Histórico de ${selectedProcedure.name}; cada origem e unidade forma uma série própria.`
                : `Sem procedimento com registro em ${periodLabel}.`
            }
          />
          {selectedProcedure ? (
            <div className="mt-4">
              <MonthlyEvolutionCharts
                series={productionHistory}
                procedureName={selectedProcedure.name}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              A evolução aparecerá quando houver lançamentos nesta competência.
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <SectionHeader
            title="Pequenas Cirurgias"
            description="Datas futuras, capacidade e status agregados; sem nomes de pacientes nesta visão."
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p className="rounded-lg bg-muted/60 p-3">
              Datas futuras · próximos 2 anos
              <strong className="mt-1 block text-xl">
                {surgery.day_count}
              </strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Vagas livres
              <strong className="mt-1 block text-xl">{available}</strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Aguardando confirmação
              <strong className="mt-1 block text-xl">
                {surgery.awaiting_confirmation}
              </strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Confirmados
              <strong className="mt-1 block text-xl">
                {surgery.confirmed}
              </strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Fila de espera
              <strong className="mt-1 block text-xl">
                {surgery.waiting_count}
              </strong>
            </p>
          </div>
          {surgery.days.length ? (
            <ul className="mt-4 divide-y">
              {surgery.days.slice(0, 4).map((day) => (
                <li
                  key={day.id}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(`${day.procedure_date}T12:00:00Z`))}
                  </span>
                  <span>
                    {day.occupied}/{day.capacity} ocupadas
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Não há datas futuras cadastradas.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            title="Importações SUS recentes"
            description="Competência, volume e estado das últimas importações administrativas."
          />
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/producao/importacoes"
          >
            Abrir importações
          </Link>
        </div>
        {productionImports.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma importação registrada.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {productionImports.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    Competência{" "}
                    {monthName(Number(item.reference_period.slice(5, 7)))}{" "}
                    {item.reference_period.slice(0, 4)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatInteger(item.row_count)} linhas ·{" "}
                    {formatInteger(item.imported_group_count)} grupos importados
                  </p>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                  {item.status === "pending_reconciliation"
                    ? `${formatInteger(item.pending_group_count)} grupos pendentes`
                    : item.status === "reconciled"
                      ? "Reconciliada"
                      : "Confirmada"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav
        aria-label="Acessos de administração"
        className="flex flex-wrap gap-2 text-sm"
      >
        <Link
          className="rounded-md border px-3 py-2 hover:bg-muted"
          href="/financeiro/indicadores"
        >
          Financeiro detalhado
        </Link>
        <Link
          className="rounded-md border px-3 py-2 hover:bg-muted"
          href="/internacoes"
        >
          Internações e metas
        </Link>
        <Link
          className="rounded-md border px-3 py-2 hover:bg-muted"
          href="/producao/indicadores"
        >
          Indicadores de Produção
        </Link>
        <Link
          className="rounded-md border px-3 py-2 hover:bg-muted"
          href="/pequenas-cirurgias"
        >
          Pequenas Cirurgias
        </Link>
      </nav>
    </div>
  );
}
