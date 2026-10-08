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
import { parseYearMonth, saoPauloToday } from "@/modules/admissions/period";
import { summarizeAdmissions } from "@/modules/admissions/domain";
import {
  listAdmissionEntries,
  listAdmissionTargets,
} from "@/modules/admissions/repository";
import { buildIndicatorsData } from "@/modules/finance/indicators/domain";
import { loadIndicatorsSource } from "@/modules/finance/indicators/repository";
import { AdmissionDashboardChart } from "@/modules/admissions/admission-dashboard-chart";
import { MonthlyChart } from "@/modules/finance/indicators/monthly-chart";
import { loadProductionIndicatorSource } from "@/modules/production/repository";
import {
  listSurgeryWaitlist,
  listUpcomingSurgeryDays,
} from "@/modules/minor-surgeries/repository";
import {
  formatCurrency,
  formatInteger,
  getProductionForMonth,
  monthName,
  summarizeSurgeryDays,
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
  const [
    admissionEntries,
    targets,
    financeSource,
    productionSource,
    surgeryDays,
    waitlist,
  ] = await Promise.all([
    listAdmissionEntries(startDate, endDate),
    listAdmissionTargets(startDate, endDate),
    loadIndicatorsSource(`${period.year}-01`, `${period.year}-12`),
    loadProductionIndicatorSource(),
    listUpcomingSurgeryDays(),
    listSurgeryWaitlist(1),
  ]);
  const today = saoPauloToday();
  const admissions = summarizeAdmissions(
    admissionEntries,
    targets,
    period.year,
    period.month,
    today,
  );
  const finance = buildIndicatorsData(
    { inicio: `${period.year}-01`, fim: `${period.year}-12`, setor: "todos" },
    financeSource.purchases,
    financeSource.fairExpenses,
  );
  const selectedMonth = finance.monthly.find(
    (item) => item.month === competence,
  );
  const monthlyPurchases = finance.purchases.filter(
    (purchase) => purchase.orderDate.slice(0, 7) === competence,
  );
  const production = getProductionForMonth(
    productionSource.entries,
    period.year,
    period.month,
  );
  const surgery = summarizeSurgeryDays(surgeryDays);
  const available = Math.max(0, surgery.capacity - surgery.occupied);
  const money = (value: bigint) => Number(value) / 100;
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
            detail={`${monthlyPurchases.filter((item) => item.sector === "farmacia").length} itens de Farmácia · ${monthlyPurchases.filter((item) => item.sector === "laboratorio").length} de Laboratório`}
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
            label="Vagas futuras disponíveis"
            value={formatInteger(available)}
            detail={`${surgery.occupied} ocupadas · ${waitlist.waiting.length} na fila`}
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
            points={finance.monthly.map((item) => ({
              month: item.month,
              label: monthName(Number(item.month.slice(5, 7))),
              pharmacy: money(item.pharmacyCents),
              laboratory: money(item.laboratoryCents),
              fair: money(item.fairCents),
              total: money(item.totalCents),
              hasRecords: item.hasRecords,
            }))}
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
            title="Pequenas Cirurgias"
            description="Datas futuras, capacidade e status agregados; sem nomes de pacientes nesta visão."
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p className="rounded-lg bg-muted/60 p-3">
              Datas futuras
              <strong className="mt-1 block text-xl">
                {surgeryDays.length}
              </strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Vagas livres
              <strong className="mt-1 block text-xl">{available}</strong>
            </p>
            <p className="rounded-lg bg-muted/60 p-3">
              Aguardando confirmação
              <strong className="mt-1 block text-xl">{surgery.awaiting}</strong>
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
                {waitlist.waiting.length}
              </strong>
            </p>
          </div>
          {surgeryDays.length ? (
            <ul className="mt-4 divide-y">
              {surgeryDays.slice(0, 4).map((day) => (
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
