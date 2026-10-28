"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion";
import type {
  DashboardProductionMonth,
  DashboardProductionMonthlyData,
} from "./production-monthly";
import { monthName } from "./domain";
import {
  DashboardQuickView,
  DashboardQuickViewDialog,
} from "./dashboard-quick-view";

const quantityFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});
const dimensionColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DashboardProductionMonthlyChart({
  points,
  year,
  selectedMonth,
  today,
  unavailable = false,
  unavailableMessage = "Não foi possível consultar os dados de Produção.",
  embedded = false,
}: {
  points: DashboardProductionMonthlyData | null;
  year: number;
  selectedMonth: number;
  today: string;
  unavailable?: boolean;
  unavailableMessage?: string;
  embedded?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const chartId = "dashboard-production-" + useId().replaceAll(":", "");
  const [manualActiveMonth, setManualActiveMonth] = useState<{
    year: number;
    selectedMonth: number;
    month: number;
  } | null>(null);
  const activeMonth =
    manualActiveMonth?.year === year &&
    manualActiveMonth.selectedMonth === selectedMonth
      ? manualActiveMonth.month
      : selectedMonth;
  const [quickViewMonth, setQuickViewMonth] = useState<number | null>(null);
  const chartFocusRef = useRef<HTMLElement | null>(null);
  const activePointIndex = useRef<number | null>(null);
  const dimensions = points?.dimensions ?? [];
  const chartMonths: readonly DashboardProductionMonth[] =
    points?.months ??
    Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      label: monthName(index + 1),
      longLabel: monthName(index + 1),
      isAfterSelected: index + 1 > selectedMonth,
      isCurrentPartial:
        `${year}-${String(index + 1).padStart(2, "0")}` === today.slice(0, 7),
      values: {} as DashboardProductionMonth["values"],
    }));
  const recordedMonthCount = chartMonths.filter(
    (month) =>
      !month.isAfterSelected &&
      dimensions.some((dimension) => month.values[dimension.key]?.hasRecords),
  ).length;
  const chartData = chartMonths.map((month) => ({
    ...month,
    ...Object.fromEntries(
      dimensions.map((dimension) => [
        dimension.key,
        month.isAfterSelected
          ? null
          : (month.values[dimension.key]?.quantity ?? null),
      ]),
    ),
  }));
  const currentMonth = today.slice(0, 7);
  const comparisons = points?.yearComparisons ?? [];
  const currentMonthPoint = chartMonths.find((month) => month.isCurrentPartial);
  const quickViewData = chartMonths.find(
    (month) => month.month === quickViewMonth,
  );
  const quickViewValues = dimensions.flatMap((dimension) => {
    const value = quickViewData?.values[dimension.key];
    return value?.hasRecords ? [{ dimension, exact: value.exact }] : [];
  });
  const quickViewPrimaryValue =
    !quickViewData || quickViewData.isAfterSelected
      ? "Sem dados no período aplicado"
      : quickViewValues.length === 0
        ? "Sem lançamento"
        : quickViewValues.length === 1
          ? `${quickViewValues[0]!.exact} ${quickViewValues[0]!.dimension.unit}`
          : `${quickViewValues.length} classificações`;
  const openMonth = (month: number | undefined) => {
    if (!month || month < 1 || month > 12) return;
    setManualActiveMonth({ year, selectedMonth, month });
    setQuickViewMonth(month);
  };
  let content: ReactNode;

  if (unavailable || dimensions.length === 0) {
    content = (
      <figure
        className={`relative mt-3 h-[var(--dashboard-chart-height-mobile)] w-full min-w-0 sm:h-[var(--dashboard-chart-height)] ${recordedMonthCount <= 1 || unavailable ? "dashboard-production-chart-sparse" : ""}`}
        aria-label={`Produção mensal em ${year}, sem valores apresentados`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 14, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="label"
              tickFormatter={(label: string) => label.slice(0, 3)}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: "var(--dashboard-chart-tick-size, 12px)",
                fill: "var(--muted-foreground)",
              }}
              tickMargin={8}
              interval={0}
            />
          </BarChart>
        </ResponsiveContainer>
        <p
          role={unavailable ? "alert" : "status"}
          className="pointer-events-none absolute inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-xl border border-border/70 bg-card/90 px-4 py-3 text-center text-sm leading-5 text-muted-foreground shadow-sm"
        >
          {unavailable
            ? unavailableMessage
            : "Sem lançamentos de Produção até a competência selecionada."}
        </p>
      </figure>
    );
  } else {
    content = (
      <>
        <figure
          ref={chartFocusRef}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || activePointIndex.current === null)
              return;
            event.preventDefault();
            openMonth(chartMonths[activePointIndex.current]?.month);
          }}
          className={`dashboard-production-chart-figure mt-3 h-[var(--dashboard-chart-height-mobile)] w-full min-w-0 sm:h-[var(--dashboard-chart-height)] ${recordedMonthCount <= 1 ? "dashboard-production-chart-sparse" : ""}`}
          aria-label={
            "Quantidades mensais de Produção em " +
            year +
            ", separadas por unidade de contagem e origem, " +
            recordedMonthCount +
            " meses com registros"
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              accessibilityLayer
              onMouseMove={(state) => {
                activePointIndex.current =
                  typeof state.activeTooltipIndex === "number"
                    ? state.activeTooltipIndex
                    : null;
              }}
              onClick={(state) => {
                const index = state.activeTooltipIndex;
                if (typeof index === "number") {
                  openMonth(chartMonths[index]?.month);
                }
              }}
              margin={{ top: 14, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="18%"
            >
              <defs>
                <pattern
                  id={chartId + "-partial"}
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width="6"
                    height="6"
                    fill="var(--chart-1)"
                    fillOpacity=".14"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="var(--chart-1)"
                    strokeWidth="2"
                  />
                </pattern>
                <pattern
                  id={chartId + "-partial-selected"}
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width="6"
                    height="6"
                    fill="var(--chart-1)"
                    fillOpacity=".18"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="var(--chart-1)"
                    strokeWidth="3"
                  />
                </pattern>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                tickFormatter={(label: string) => label.slice(0, 3)}
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: "var(--dashboard-chart-tick-size, 12px)",
                  fill: "var(--muted-foreground)",
                }}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickMargin={6}
                tickCount={4}
                tickFormatter={(value: number) => quantityFormat.format(value)}
              />
              <Tooltip
                filterNull={false}
                cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
                content={({ active, label }) => {
                  const month = chartMonths.find(
                    (item) => item.label === label,
                  );
                  if (!active || !month) return null;
                  const competence =
                    year + "-" + String(month.month).padStart(2, "0");
                  const hasRecords = dimensions.some(
                    (dimension) => month.values[dimension.key]?.hasRecords,
                  );
                  const state = month.isAfterSelected
                    ? "Após a competência selecionada"
                    : competence > currentMonth
                      ? "Período futuro"
                      : competence === currentMonth
                        ? "Competência em andamento · sem lançamento cadastrado"
                        : "Sem lançamento cadastrado";

                  return (
                    <div role="tooltip" className="dashboard-chart-tooltip">
                      <p className="dashboard-chart-tooltip-period">
                        {month.longLabel} de {year}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {dimensions.map((dimension) => {
                          const value = month.values[dimension.key];
                          return (
                            <p
                              key={dimension.key}
                              className="flex max-w-64 items-baseline justify-between gap-4 text-xs"
                            >
                              <span className="text-white/70">
                                {dimension.label}
                              </span>
                              <span className="shrink-0 font-medium tabular-nums text-white">
                                {value?.hasRecords
                                  ? value.exact + " " + dimension.unit
                                  : "—"}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                      {month.isAfterSelected || !hasRecords ? (
                        <p className="mt-2 border-t border-white/10 pt-2 text-xs text-white/65">
                          {state}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              {dimensions.length > 1 ? (
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              ) : null}
              {dimensions.map((dimension, dimensionIndex) => (
                <Bar
                  key={dimension.key}
                  dataKey={dimension.key}
                  name={dimension.label}
                  fill={
                    dimensionColors[dimensionIndex % dimensionColors.length]
                  }
                  radius={[4, 4, 0, 0]}
                  maxBarSize={dimensions.length === 1 ? 28 : 18}
                  onClick={(item) => {
                    const payload = item.payload as
                      { month?: unknown } | undefined;
                    const month = Number(payload?.month);
                    if (Number.isInteger(month)) openMonth(month);
                  }}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={280}
                >
                  {chartData.map((month) => {
                    const competence =
                      year + "-" + String(month.month).padStart(2, "0");
                    const selected = month.month === activeMonth;
                    const fill =
                      month.isCurrentPartial && selected
                        ? "url(#" + chartId + "-partial-selected)"
                        : month.isCurrentPartial
                          ? "url(#" + chartId + "-partial)"
                          : selected
                            ? "var(--chart-1)"
                            : dimensionColors[
                                dimensionIndex % dimensionColors.length
                              ];
                    return (
                      <Cell
                        key={competence}
                        fill={fill}
                        fillOpacity={
                          selected || month.isCurrentPartial ? 1 : 0.38
                        }
                      />
                    );
                  })}
                  {dimensions.length <= 2 ? (
                    <LabelList
                      dataKey={dimension.key}
                      position="top"
                      formatter={(value) =>
                        value === null || value === undefined
                          ? ""
                          : quantityFormat.format(Number(value))
                      }
                      className="fill-muted-foreground text-[11px] tabular-nums"
                    />
                  ) : null}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <figcaption className="sr-only">
            Quantidades de produção agrupadas por mês, unidade e origem. Meses
            sem lançamento não são apresentados como zero.
          </figcaption>
        </figure>
        <DashboardQuickViewDialog
          open={quickViewMonth !== null}
          onOpenChange={(open) => {
            if (!open) setQuickViewMonth(null);
          }}
          finalFocusRef={chartFocusRef}
          title={quickViewData?.longLabel ?? "Produção mensal"}
          period={year.toString()}
          description={
            quickViewData?.isAfterSelected
              ? "Esta competência está após o período aplicado e não possui dados no gráfico."
              : "Quantidades agrupadas por unidade de contagem e origem."
          }
          primaryLabel={
            quickViewValues.length === 1
              ? `${quickViewValues[0]!.dimension.unit} · ${quickViewValues[0]!.dimension.source}`
              : "Origens com registros"
          }
          primaryValue={quickViewPrimaryValue}
          details={
            !quickViewData || quickViewData.isAfterSelected
              ? []
              : dimensions.map((dimension) => {
                  const value = quickViewData.values[dimension.key];
                  return {
                    label: `${dimension.unit} · ${dimension.source}`,
                    value: value?.hasRecords
                      ? `${value.exact} ${dimension.unit}`
                      : "Sem lançamento",
                  };
                })
          }
          href="/producao/lancamentos"
          hrefLabel="Abrir Produção"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-muted-foreground">
          {today.slice(0, 4) === String(year) && currentMonthPoint ? (
            <p>
              {dimensions.some(
                (dimension) =>
                  currentMonthPoint.values[dimension.key]?.hasRecords,
              )
                ? `${currentMonthPoint.label} parcial até o dia ${Number(today.slice(8, 10))}.`
                : `${currentMonthPoint.label} em andamento · sem lançamento.`}
            </p>
          ) : null}
          {points?.averages.length || comparisons.length ? (
            <DashboardQuickView
              trigger={
                <>
                  <Info aria-hidden="true" className="size-4" /> Sobre os dados
                </>
              }
              triggerLabel="Ver médias e comparações da Produção Mensal"
              triggerClassName="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Contexto da Produção Mensal"
              period={String(year)}
              details={[
                ...(points?.averages ?? []).map((item) => ({
                  label: `Média · ${item.dimension}`,
                  value: item.value,
                })),
                ...comparisons.map((item) => ({
                  label: `Comparação · ${item.dimension}`,
                  value: `${item.previous} → ${item.current}`,
                })),
              ]}
            />
          ) : null}
        </div>
      </>
    );
  }

  return (
    <section
      className={
        embedded
          ? "dashboard-production-chart dashboard-production-panel min-w-0"
          : "dashboard-production-chart dashboard-production-panel dashboard-surface min-w-0 p-[var(--dashboard-panel-padding-compact)] sm:p-[var(--dashboard-panel-padding)] lg:p-[var(--dashboard-panel-padding-wide)]"
      }
    >
      <header>
        <h2 className="text-lg font-semibold leading-6 tracking-tight text-foreground">
          Produção Mensal
        </h2>
        <p className="mt-[var(--space-1)] text-sm leading-5 text-muted-foreground">
          Quantidades registradas · {year}
        </p>
      </header>
      {content}
    </section>
  );
}
