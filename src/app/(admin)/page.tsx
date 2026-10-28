import "./dashboard.css";
import { unstable_rethrow } from "next/navigation";
import { Bed, ClipboardList, DollarSign, Gauge } from "lucide-react";
import { DashboardModuleLink } from "@/modules/admin-dashboard/dashboard-components";
import {
  DASHBOARD_ACTIVITY_PAGE_SIZE,
  DashboardRecordsAgenda,
} from "@/modules/admin-dashboard/dashboard-records-agenda";
import type { DashboardActivityRow } from "@/modules/admin-dashboard/dashboard-records-agenda";
import {
  addMonthsClamped,
  parseYearMonth,
  saoPauloToday,
} from "@/modules/admissions/period";
import { loadAdmissionDashboard } from "@/modules/admin-dashboard/admissions";
import {
  captureDashboardQuery,
  dashboardQueryErrorMessage,
} from "@/modules/admin-dashboard/query-state";
import { DashboardFinancialChart } from "@/modules/admin-dashboard/financial-chart";
import { DashboardProductionMonthlyChart } from "@/modules/admin-dashboard/production-monthly-chart";
import { DashboardPeriodFilter } from "@/modules/admin-dashboard/dashboard-period-filter";
import {
  listMonthlyExpenseTotals,
  MonthlyExpenseTotalsQueryError,
  MonthlyExpenseTotalsRpcUnavailableError,
} from "@/modules/finance/indicators/repository";
import {
  amountToCents,
  currencyChartScale,
  currencyChartValue,
} from "@/modules/finance/indicators/domain";
import { loadProductionIndicatorSource } from "@/modules/production/repository";
import { listProductionImports } from "@/modules/production-import/repository";
import { loadSurgerySummaryForDashboard } from "@/modules/minor-surgeries/repository";
import { logDashboardQueryFailure } from "@/lib/neon/dashboard-diagnostics";
import { formatCompactCurrency } from "@/modules/finance/pharmacy/format";
import {
  formatCurrency,
  formatInteger,
  getProductionForMonth,
  monthName,
} from "@/modules/admin-dashboard/domain";
import { buildDashboardProductionMonthlyData } from "@/modules/admin-dashboard/production-monthly";

export const dynamic = "force-dynamic";

type DashboardQueryOperation =
  | "finance_totals"
  | "production_indicators"
  | "production_imports"
  | "surgery_summary";

async function loadDashboardQuery<T>(
  operation: DashboardQueryOperation,
  query: () => Promise<T>,
) {
  const startedAt = performance.now();
  return captureDashboardQuery(query, (error) => {
    unstable_rethrow(error);
    logDashboardQueryFailure({
      operation,
      stage: "data_api",
      error,
      durationMs: performance.now() - startedAt,
    });
  });
}

type HomeProps = Readonly<{
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
    q?: string | string[];
    category?: string | string[];
    page?: string | string[];
  }>;
}>;

async function loadDashboardFinanceRows(startMonth: string, endMonth: string) {
  const startedAt = performance.now();
  try {
    return {
      kind: "available" as const,
      rows: await listMonthlyExpenseTotals(startMonth, endMonth),
    };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof MonthlyExpenseTotalsRpcUnavailableError) {
      logDashboardQueryFailure({
        operation: "finance_totals",
        stage: "data_api",
        durationMs: performance.now() - startedAt,
      });
      return { kind: "rpc_unavailable" as const, code: null };
    }
    if (error instanceof MonthlyExpenseTotalsQueryError) {
      logDashboardQueryFailure({
        operation: "finance_totals",
        stage: "data_api",
        error,
        durationMs: performance.now() - startedAt,
      });
      return { kind: "query_error" as const, code: error.code };
    }
    throw error;
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const period = parseYearMonth(params);
  const searchQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const selectedCategory =
    typeof params.category === "string" &&
    ["admissions", "production", "surgeries", "imports"].includes(
      params.category,
    )
      ? params.category
      : "all";
  const startDate = `${period.year}-01-01`;
  const endDate = `${period.year + 1}-01-01`;
  const competence = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const today = saoPauloToday();
  const todayDate = today.toISOString().slice(0, 10);
  const surgeryThrough = addMonthsClamped(today, 24);
  const financeRowsPromise = loadDashboardFinanceRows(
    `${period.year}-01`,
    `${period.year}-12`,
  );
  const [
    admissionQuery,
    financeQuery,
    productionQuery,
    importsQuery,
    surgeryQuery,
  ] = await Promise.all([
    loadAdmissionDashboard({
      startDate,
      endDate,
      year: period.year,
      month: period.month,
      today,
    }),
    loadDashboardQuery("finance_totals", () => financeRowsPromise),
    loadDashboardQuery("production_indicators", () =>
      loadProductionIndicatorSource({
        from: `${period.year - 1}-01`,
        to: `${period.year}-12`,
      }),
    ),
    loadDashboardQuery("production_imports", () => listProductionImports(3)),
    loadDashboardQuery("surgery_summary", () =>
      loadSurgerySummaryForDashboard(
        todayDate,
        surgeryThrough.toISOString().slice(0, 10),
        50,
      ),
    ),
  ]);
  const admissionResult = admissionQuery;
  const financeRows =
    financeQuery.kind === "available"
      ? financeQuery.data
      : { kind: "query_error" as const, code: financeQuery.code };
  const productionSource =
    productionQuery.kind === "available" ? productionQuery.data : null;
  const productionImports =
    importsQuery.kind === "available" ? importsQuery.data : null;
  const surgeryResult =
    surgeryQuery.kind === "available"
      ? surgeryQuery.data
      : { kind: "unavailable" as const, code: surgeryQuery.code };
  const productionUnavailable = productionSource === null;
  const importsUnavailable = productionImports === null;
  const productionUnavailableMessage = dashboardQueryErrorMessage(
    productionQuery.kind === "unavailable" ? productionQuery.code : null,
    "a Produção",
  );
  const importsUnavailableMessage = dashboardQueryErrorMessage(
    importsQuery.kind === "unavailable" ? importsQuery.code : null,
    "as importações SUS",
  );
  const financeUnavailable = financeRows.kind !== "available";
  const surgery =
    surgeryResult.kind === "available" ? surgeryResult.summary : null;
  const surgeryUnavailableMessage =
    surgeryResult.kind === "unavailable"
      ? dashboardQueryErrorMessage(surgeryResult.code, "Pequenas Cirurgias")
      : null;
  const financeUnavailableMessage =
    financeRows.kind === "rpc_unavailable"
      ? "A consulta de totais exatos não está disponível neste ambiente."
      : financeRows.kind === "query_error"
        ? dashboardQueryErrorMessage(financeRows.code, "os totais financeiros")
        : null;
  const admissions =
    admissionResult.kind === "available" ? admissionResult.dashboard : null;
  const admissionsUnavailable = admissions === null;
  const admissionsUnavailableMessage =
    admissionResult.kind === "unavailable"
      ? dashboardQueryErrorMessage(null, "as Internações")
      : null;
  const finance = (
    financeRows.kind === "available" ? financeRows.rows : []
  ).map((row) => {
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
      hasFairRecords: row.has_fair_record,
    };
  });
  const selectedMonth = finance.find((item) => item.month === competence);
  const financeHasRecords = selectedMonth?.hasRecords ?? false;
  const admissionHasVolume = (admissions?.monthlyTotal ?? 0) > 0;
  const admissionMonthsWithVolume =
    admissions?.monthlyEvolution.filter((item) => item.quantity > 0).length ??
    0;
  const productionEntries = productionSource?.entries ?? [];
  const productionChartUnavailable = productionUnavailable;
  const productionChartUnavailableMessage = productionUnavailableMessage;
  const production = getProductionForMonth(
    productionEntries,
    period.year,
    period.month,
  );
  const productionProcedureCount = new Set(
    production.map((item) => item.procedureId),
  ).size;
  const productionHasRecords = production.length > 0;
  const selectedProcedure = production[0];
  const productionTrend = productionSource
    ? buildDashboardProductionMonthlyData(
        productionEntries,
        period.year,
        period.month,
        todayDate.slice(0, 7),
      )
    : null;
  const available = surgery
    ? Math.max(0, surgery.capacity - surgery.occupied)
    : null;
  const financeScales = {
    pharmacy: currencyChartScale(
      finance
        .filter((month) => month.pharmacyItemCount > 0)
        .map((month) => month.pharmacyCents),
    ),
    laboratory: currencyChartScale(
      finance
        .filter((month) => month.laboratoryItemCount > 0)
        .map((month) => month.laboratoryCents),
    ),
    fair: currencyChartScale(
      finance
        .filter((month) => month.hasFairRecords)
        .map((month) => month.fairCents),
    ),
    total: currencyChartScale(
      finance
        .filter((month) => month.hasRecords)
        .map((month) => month.totalCents),
    ),
  };
  const financeChartMonths = Array.from({ length: 12 }, (_, index) => {
    const month = `${period.year}-${String(index + 1).padStart(2, "0")}`;
    return (
      finance.find((item) => item.month === month) ?? {
        month,
        pharmacyCents: BigInt(0),
        laboratoryCents: BigInt(0),
        fairCents: BigInt(0),
        totalCents: BigInt(0),
        pharmacyItemCount: 0,
        laboratoryItemCount: 0,
        hasRecords: false,
        hasFairRecords: false,
      }
    );
  });
  const periodLabel = `${monthName(period.month)} ${period.year}`;
  const selectedAdmissionMonth = admissions?.monthlyEvolution.find(
    (item) => item.month === period.month,
  );
  const admissionPeriodStatus =
    admissions?.periodStatus === "closed"
      ? "Período encerrado"
      : admissions?.periodStatus === "in_progress"
        ? "Período em andamento"
        : "Período futuro";
  const activityRows: DashboardActivityRow[] = [
    ...(selectedAdmissionMonth && selectedAdmissionMonth.quantity > 0
      ? [
          {
            id: `admissions-${period.year}-${period.month}`,
            category: "admissions" as const,
            area: "Internações",
            title: "Resumo mensal de Internações",
            detail:
              "Quantidade mensal agregada; contagem de registros de origem indisponível.",
            period: periodLabel,
            sortDate: `${competence}-01`,
            quantity: formatInteger(selectedAdmissionMonth.quantity),
            metricLabel: "Quantidade mensal",
            status: admissionPeriodStatus,
            tone: "neutral" as const,
            href: "/internacoes",
          },
        ]
      : []),
    ...production.slice(0, 5).map((item) => ({
      id: `production-${item.id}`,
      category: "production" as const,
      area: "Produção",
      title: item.name,
      detail: `${item.source} · ${item.unit}`,
      period: periodLabel,
      sortDate: `${competence}-01`,
      quantity: `${formatInteger(item.quantity)} ${item.unit}`,
      status: "Registrado",
      tone: "neutral" as const,
      href: "/producao/lancamentos",
    })),
    ...(productionImports ?? []).slice(0, 3).map((item) => ({
      id: `import-${item.id}`,
      category: "imports" as const,
      area: "Importação SUS",
      title: `Importação de ${monthName(Number(item.reference_period.slice(5, 7)))} ${item.reference_period.slice(0, 4)}`,
      detail: `${formatInteger(item.imported_group_count)} grupos importados`,
      period: `${monthName(Number(item.reference_period.slice(5, 7)))} ${item.reference_period.slice(0, 4)}`,
      sortDate: item.reference_period,
      quantity: `${formatInteger(item.row_count)} ${item.row_count === 1 ? "linha" : "linhas"}`,
      status:
        item.status === "pending_reconciliation"
          ? `${formatInteger(item.pending_group_count)} pendentes`
          : item.status === "reconciled"
            ? "Reconciliada"
            : "Confirmada",
      tone:
        item.status === "pending_reconciliation"
          ? ("warning" as const)
          : ("success" as const),
      href: "/producao/importacoes",
    })),
    ...(surgery?.days ?? []).slice(0, 5).map((day) => {
      const date = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${day.procedure_date}T12:00:00Z`));
      const free = Math.max(0, day.capacity - day.occupied);
      return {
        id: `surgery-${day.id}`,
        category: "surgeries" as const,
        area: "Pequenas Cirurgias",
        title: `Agenda de ${date}`,
        detail: `${formatInteger(day.occupied)} de ${formatInteger(day.capacity)} vagas ocupadas`,
        period: date,
        sortDate: day.procedure_date,
        quantity: `${formatInteger(day.occupied)} / ${formatInteger(day.capacity)}`,
        status:
          free === 0
            ? "Sem vagas"
            : `${formatInteger(free)} ${free === 1 ? "vaga livre" : "vagas livres"}`,
        tone: free === 0 ? ("neutral" as const) : ("success" as const),
        href: `/pequenas-cirurgias/dias/${day.id}`,
      };
    }),
  ].sort((left, right) => {
    const leftUpcoming =
      left.category === "surgeries" && left.sortDate >= todayDate;
    const rightUpcoming =
      right.category === "surgeries" && right.sortDate >= todayDate;
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
    return leftUpcoming
      ? left.sortDate.localeCompare(right.sortDate)
      : right.sortDate.localeCompare(left.sortDate);
  });
  const normalizedSearch = searchQuery.toLocaleLowerCase("pt-BR");
  const filteredActivityRows = activityRows.filter((row) => {
    const belongsToSelectedCategory =
      selectedCategory === "all" ||
      row.category === selectedCategory ||
      (selectedCategory === "production" && row.category === "imports");
    if (!belongsToSelectedCategory) {
      return false;
    }
    return (
      !normalizedSearch ||
      [row.area, row.title, row.detail, row.period, row.quantity, row.status]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch)
    );
  });
  const requestedPage =
    typeof params.page === "string" && /^\d{1,3}$/.test(params.page)
      ? Number(params.page)
      : 1;
  const activityPageCount = Math.max(
    1,
    Math.ceil(filteredActivityRows.length / DASHBOARD_ACTIVITY_PAGE_SIZE),
  );
  const activityPage = Math.min(Math.max(1, requestedPage), activityPageCount);
  const visibleActivityRows = filteredActivityRows.slice(
    (activityPage - 1) * DASHBOARD_ACTIVITY_PAGE_SIZE,
    activityPage * DASHBOARD_ACTIVITY_PAGE_SIZE,
  );
  return (
    <div className="dashboard-motion-safe w-full space-y-[var(--dashboard-section-gap)]">
      <header className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[length:var(--type-page-title)] font-bold leading-[1.1] tracking-tight text-foreground text-balance sm:text-[length:var(--dashboard-page-title-wide)]">
            Visão Geral
          </h1>
        </div>

        <div className="flex w-full min-w-0 items-center sm:w-auto sm:justify-end">
          <DashboardPeriodFilter
            key={`${period.year}-${period.month}`}
            initialMonth={period.month}
            initialYear={period.year}
            searchQuery={searchQuery}
            category={selectedCategory}
          />
        </div>
      </header>

      <section aria-label="Indicadores e módulos administrativos">
        <div className="dashboard-kpi-grid min-w-0">
          <DashboardModuleLink
            href="/financeiro"
            title="Financeiro"
            icon={DollarSign}
            metricLabel="Total no mês"
            metricPeriod={periodLabel}
            metricValue={
              financeUnavailable
                ? "Indisponível"
                : selectedMonth && financeHasRecords
                  ? formatCompactCurrency(selectedMonth.totalCents)
                  : "—"
            }
            metricDetail={
              financeUnavailable
                ? (financeUnavailableMessage ??
                  "Não foi possível consultar este indicador.")
                : financeHasRecords
                  ? "Despesas administrativas no mês"
                  : "Sem lançamentos nesta competência."
            }
            metricExactValue={
              financeHasRecords && selectedMonth
                ? formatCurrency(selectedMonth.totalCents)
                : undefined
            }
            metricContext={
              financeUnavailable || !financeHasRecords || !selectedMonth
                ? undefined
                : [
                    {
                      label: "Farmácia",
                      value:
                        selectedMonth.pharmacyItemCount === 0
                          ? "Sem lançamentos"
                          : formatCompactCurrency(selectedMonth.pharmacyCents),
                      ...(selectedMonth.pharmacyItemCount > 0
                        ? {
                            exactValue: formatCurrency(
                              selectedMonth.pharmacyCents,
                            ),
                          }
                        : {}),
                    },
                    {
                      label: "Laboratório",
                      value:
                        selectedMonth.laboratoryItemCount === 0
                          ? "Sem lançamentos"
                          : formatCompactCurrency(
                              selectedMonth.laboratoryCents,
                            ),
                      ...(selectedMonth.laboratoryItemCount > 0
                        ? {
                            exactValue: formatCurrency(
                              selectedMonth.laboratoryCents,
                            ),
                          }
                        : {}),
                    },
                    {
                      label: "Feira",
                      value: formatCompactCurrency(selectedMonth.fairCents),
                      exactValue: formatCurrency(selectedMonth.fairCents),
                    },
                  ]
            }
            metricTrend={
              financeUnavailable
                ? undefined
                : finance.map((item) => ({
                    label: monthName(Number(item.month.slice(5, 7))),
                    value: item.hasRecords
                      ? currencyChartValue(item.totalCents, financeScales.total)
                      : null,
                    exactValue: item.hasRecords
                      ? formatCurrency(item.totalCents)
                      : undefined,
                    compactValue: item.hasRecords
                      ? formatCompactCurrency(item.totalCents)
                      : undefined,
                  }))
            }
          />
          <DashboardModuleLink
            href="/internacoes"
            title="Internações"
            icon={Bed}
            metricLabel="Quantidade lançada no mês"
            metricPeriod={periodLabel}
            metricValue={
              admissionsUnavailable
                ? "Indisponível"
                : formatInteger(admissions.monthlyTotal)
            }
            metricDetail={
              admissionsUnavailable
                ? (admissionsUnavailableMessage ??
                  "Não foi possível consultar este indicador.")
                : !admissionHasVolume
                  ? "Sem volume lançado nesta competência."
                  : `Quantidade mensal agregada${admissions.monthTarget === null ? " · meta mensal não configurada" : ` · meta mensal ${formatInteger(admissions.monthTarget)}`}`
            }
            metricContext={
              admissions
                ? [
                    {
                      label: "Quantidade agregada no mês",
                      value: formatInteger(admissions.monthlyTotal),
                    },
                    {
                      label: "Meta mensal",
                      value:
                        admissions.monthTarget === null
                          ? "Não configurada"
                          : formatInteger(admissions.monthTarget),
                    },
                    {
                      label: `Acumulado no ano · ${admissionMonthsWithVolume} ${admissionMonthsWithVolume === 1 ? "mês" : "meses"} com volume`,
                      value: formatInteger(admissions.annualTotal),
                    },
                    {
                      label: "Meta anual",
                      value:
                        admissions.yearTarget === null
                          ? "Não configurada"
                          : formatInteger(admissions.yearTarget),
                    },
                  ]
                : undefined
            }
            metricTrend={
              admissions
                ? admissions.monthlyEvolution.map((item) => ({
                    label: monthName(item.month),
                    value: item.quantity,
                    exactValue: formatInteger(item.quantity),
                  }))
                : undefined
            }
          />
          <DashboardModuleLink
            href="/producao"
            title="Produção"
            icon={ClipboardList}
            metricLabel="Tipos de procedimento no mês"
            metricPeriod={periodLabel}
            metricValue={
              productionUnavailable
                ? "Indisponível"
                : productionHasRecords
                  ? formatInteger(productionProcedureCount)
                  : "—"
            }
            metricDetail={
              productionUnavailable
                ? "Não foi possível consultar este indicador."
                : selectedProcedure
                  ? selectedProcedure.name
                  : "Sem registros nesta competência."
            }
            metricContext={
              productionUnavailable
                ? undefined
                : production.slice(0, 5).map((item) => ({
                    label: item.name,
                    value: `${formatInteger(item.quantity)} ${item.unit}`,
                    exactValue: `${formatInteger(item.quantity)} ${item.unit} · ${item.source}`,
                  }))
            }
          />
          <DashboardModuleLink
            href="/pequenas-cirurgias"
            title="Pequenas Cirurgias"
            icon={Gauge}
            metricLabel="Vagas disponíveis"
            metricPeriod="Agenda · próximos 24 meses"
            metricValue={
              surgery === null ? "Indisponível" : formatInteger(available ?? 0)
            }
            metricDetail={
              surgery
                ? "Vagas disponíveis · próximos 24 meses"
                : "Não foi possível consultar este indicador."
            }
            metricContext={
              surgery
                ? [
                    {
                      label: "Horizonte da agenda",
                      value: "Próximos 24 meses",
                    },
                    {
                      label: "Capacidade total",
                      value: formatInteger(surgery.capacity),
                    },
                    {
                      label: "Ocupadas",
                      value: `${formatInteger(surgery.occupied)} de ${formatInteger(surgery.capacity)}`,
                    },
                    {
                      label: "Aguardando confirmação",
                      value: formatInteger(surgery.awaiting_confirmation),
                    },
                    {
                      label: "Confirmados",
                      value: formatInteger(surgery.confirmed),
                    },
                    {
                      label: "Fila de espera",
                      value: formatInteger(surgery.waiting_count),
                    },
                  ]
                : undefined
            }
          />
        </div>
      </section>

      <section
        className="dashboard-analytics-grid min-w-0 gap-[var(--dashboard-grid-gap)]"
        aria-label="Gráficos principais"
      >
        <DashboardFinancialChart
          className="dashboard-finance-panel"
          year={period.year}
          unavailable={financeUnavailable}
          unavailableMessage={
            financeUnavailableMessage ?? "Consulta financeira indisponível."
          }
          qaValidationAvailable
          points={financeChartMonths.map((item) => ({
            month: item.month,
            label: monthName(Number(item.month.slice(5, 7))),
            pharmacy:
              item.pharmacyItemCount > 0
                ? currencyChartValue(item.pharmacyCents, financeScales.pharmacy)
                : null,
            pharmacyExact: formatCurrency(item.pharmacyCents),
            pharmacyCompact: formatCompactCurrency(item.pharmacyCents),
            pharmacyHasRecords: item.pharmacyItemCount > 0,
            pharmacyReliable: true,
            laboratory:
              item.laboratoryItemCount > 0
                ? currencyChartValue(
                    item.laboratoryCents,
                    financeScales.laboratory,
                  )
                : null,
            laboratoryExact: formatCurrency(item.laboratoryCents),
            laboratoryCompact: formatCompactCurrency(item.laboratoryCents),
            laboratoryHasRecords: item.laboratoryItemCount > 0,
            laboratoryReliable: true,
            fair: item.hasFairRecords
              ? currencyChartValue(item.fairCents, financeScales.fair)
              : null,
            fairExact: formatCurrency(item.fairCents),
            fairCompact: formatCompactCurrency(item.fairCents),
            fairHasRecords: item.hasFairRecords,
            fairReliable: true,
            total: item.hasRecords
              ? currencyChartValue(item.totalCents, financeScales.total)
              : null,
            totalExact: formatCurrency(item.totalCents),
            totalCompact: formatCompactCurrency(item.totalCents),
            totalHasRecords: item.hasRecords,
            totalReliable: true,
          }))}
          scales={{
            pharmacy: financeScales.pharmacy.toString(),
            laboratory: financeScales.laboratory.toString(),
            fair: financeScales.fair.toString(),
            total: financeScales.total.toString(),
          }}
        />
        <div className="dashboard-production-panel dashboard-surface min-w-0 p-[var(--dashboard-panel-padding-compact)] sm:p-[var(--dashboard-panel-padding)] lg:p-[var(--dashboard-panel-padding-wide)]">
          <DashboardProductionMonthlyChart
            points={productionTrend}
            year={period.year}
            selectedMonth={period.month}
            today={todayDate}
            unavailable={productionChartUnavailable}
            unavailableMessage={productionChartUnavailableMessage}
            embedded
          />
        </div>
      </section>
      <DashboardRecordsAgenda
        period={period}
        periodLabel={periodLabel}
        competence={competence}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        filteredActivityRows={filteredActivityRows}
        visibleActivityRows={visibleActivityRows}
        activityPage={activityPage}
        activityPageCount={activityPageCount}
        surgery={surgery}
        productionUnavailable={productionUnavailable}
        importsUnavailable={importsUnavailable}
        productionUnavailableMessage={productionUnavailableMessage}
        importsUnavailableMessage={importsUnavailableMessage}
        surgeryUnavailableMessage={surgeryUnavailableMessage}
        hasImports={(productionImports?.length ?? 0) > 0}
      />
    </div>
  );
}
