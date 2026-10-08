import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, Target } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { KpiCard } from "@/components/kpi-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdmissionDashboardChart } from "./admission-dashboard-chart";
import type { AdmissionDashboard } from "./domain";

function progressText(actual: number, target: number | null): string {
  if (target === null) return "Nenhuma meta configurada para este período.";
  if (target === 0)
    return `Meta: ${target} · percentual não calculado para meta zero.`;
  return `Meta: ${target} · ${Math.round((actual / target) * 100)}% atingido.`;
}

export function AdmissionsDashboardView({
  dashboard,
  selectedMonth,
}: {
  dashboard: AdmissionDashboard;
  selectedMonth: number;
}) {
  const monthProgress =
    dashboard.monthTarget === null
      ? null
      : dashboard.monthTarget === 0
        ? null
        : (dashboard.monthlyTotal / dashboard.monthTarget) * 100;
  const yearProgress =
    dashboard.yearTarget === null
      ? null
      : dashboard.yearTarget === 0
        ? null
        : (dashboard.annualTotal / dashboard.yearTarget) * 100;
  const periodLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(dashboard.year, selectedMonth - 1, 1)));
  return (
    <div className="grid gap-6">
      <nav
        aria-label="Navegação de Internações"
        className="flex flex-wrap gap-2"
      >
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={`/internacoes/lancamentos?year=${dashboard.year}&month=${selectedMonth}`}
        >
          Lançamentos
        </Link>
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href="/internacoes/metas"
        >
          Metas
        </Link>
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href="/internacoes/medicos"
        >
          Médicos
        </Link>
      </nav>
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
            step="1"
            defaultValue={dashboard.year}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <input
            name="month"
            type="number"
            min="1"
            max="12"
            step="1"
            defaultValue={selectedMonth}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <Button type="submit" variant="outline">
          Aplicar período
        </Button>
      </form>
      <section
        aria-label="Indicadores do período"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label={`Total em ${periodLabel}`}
          value={String(dashboard.monthlyTotal)}
          detail={progressText(dashboard.monthlyTotal, dashboard.monthTarget)}
          icon={CalendarDays}
        />
        <KpiCard
          label={`Total anual · ${dashboard.year}`}
          value={String(dashboard.annualTotal)}
          detail={progressText(dashboard.annualTotal, dashboard.yearTarget)}
          icon={ChartNoAxesCombined}
        />
        <KpiCard
          label="Progresso da meta mensal"
          value={monthProgress === null ? "—" : `${Math.round(monthProgress)}%`}
          detail={
            dashboard.monthTarget === null
              ? "Cadastre uma meta mensal para comparar."
              : `${dashboard.monthlyTotal} de ${dashboard.monthTarget} internações`
          }
          icon={Target}
        />
        <KpiCard
          label="Andamento do mês"
          value={`${dashboard.elapsedDays}/${dashboard.daysInMonth} dias`}
          detail={
            dashboard.periodStatus === "in_progress"
              ? "Período em andamento"
              : dashboard.periodStatus === "closed"
                ? "Período encerrado"
                : "Período futuro"
          }
          icon={CalendarDays}
        />
      </section>
      {yearProgress !== null && dashboard.yearTarget !== null ? (
        <p className="-mt-3 text-sm text-muted-foreground">
          Meta anual: {dashboard.annualTotal} de {dashboard.yearTarget}{" "}
          internações ({Math.round(yearProgress)}%).
        </p>
      ) : null}
      <ChartCard
        title={`Evolução mensal · ${dashboard.year}`}
        description="Quantidade administrativa registrada por mês, com identificação de período encerrado, mês atual e meses futuros."
        badge="Registros reais"
      >
        <AdmissionDashboardChart dashboard={dashboard} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <caption className="sr-only">
              Valores mensais usados no gráfico
            </caption>
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="py-2">
                  Mês
                </th>
                <th scope="col" className="py-2">
                  Quantidade
                </th>
                <th scope="col" className="py-2">
                  Situação do período
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dashboard.monthlyEvolution.map((point) => (
                <tr key={point.month}>
                  <th scope="row" className="py-2 font-medium">
                    {monthNames[point.month - 1]}
                  </th>
                  <td className="py-2">{point.quantity}</td>
                  <td className="py-2 text-muted-foreground">
                    {point.isCurrentMonth
                      ? "Em andamento · mês atual"
                      : point.isClosed
                        ? "Encerrado"
                        : "Futuro"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <section className="grid gap-3" aria-labelledby="totais-por-medico">
        <div>
          <h2 id="totais-por-medico" className="font-semibold">
            Totais por médico · {dashboard.year}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Valores agregados no período anual. A quantidade representa volume
            administrativo, não qualidade clínica.
          </p>
        </div>
        {dashboard.byDoctor.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento registrado neste ano.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Médico
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Situação
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Quantidade no ano
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Detalhe
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dashboard.byDoctor.map((doctor) => (
                    <tr key={doctor.doctorId}>
                      <th scope="row" className="px-4 py-4 font-medium">
                        {doctor.doctorName}
                      </th>
                      <td className="px-4 py-4 text-muted-foreground">
                        {doctor.active ? "Ativo" : "Inativo · histórico"}
                      </td>
                      <td className="px-4 py-4">{doctor.quantity}</td>
                      <td className="px-4 py-4">
                        <Link
                          className="text-link underline-offset-4 hover:underline"
                          href={`/internacoes/medicos/${doctor.doctorId}?year=${dashboard.year}&month=${selectedMonth}`}
                        >
                          Ver histórico
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
