"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActiveDotProps, XAxisTickContentProps } from "recharts";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion";
import { currencyChartTickCents } from "../finance/indicators/domain";
import { formatCompactCurrency } from "../finance/pharmacy/format";
import { DashboardSeriesPresentation } from "./dashboard-series-presentation";
import { getInitialDashboardFinancialSeries } from "./finance-quality";
import { DashboardQuickViewDialog } from "./dashboard-quick-view";

type SeriesKey = "pharmacy" | "laboratory" | "fair" | "total";
type ExactKey = `${SeriesKey}Exact`;
type CompactKey = `${SeriesKey}Compact`;
type RecordsKey = `${SeriesKey}HasRecords`;
type ReliableKey = `${SeriesKey}Reliable`;

type ChartPoint = Readonly<{
  month: string;
  label: string;
  pharmacy: number | null;
  pharmacyExact: string;
  pharmacyCompact: string;
  pharmacyHasRecords: boolean;
  pharmacyReliable: boolean;
  laboratory: number | null;
  laboratoryExact: string;
  laboratoryCompact: string;
  laboratoryHasRecords: boolean;
  laboratoryReliable: boolean;
  fair: number | null;
  fairExact: string;
  fairCompact: string;
  fairHasRecords: boolean;
  fairReliable: boolean;
  total: number | null;
  totalExact: string;
  totalCompact: string;
  totalHasRecords: boolean;
  totalReliable: boolean;
}>;

const series: ReadonlyArray<{
  key: SeriesKey;
  label: string;
  color: string;
  exactKey: ExactKey;
  compactKey: CompactKey;
  recordsKey: RecordsKey;
  reliableKey: ReliableKey;
}> = [
  {
    key: "pharmacy",
    label: "Farmácia",
    color: "var(--chart-2)",
    exactKey: "pharmacyExact",
    compactKey: "pharmacyCompact",
    recordsKey: "pharmacyHasRecords",
    reliableKey: "pharmacyReliable",
  },
  {
    key: "laboratory",
    label: "Laboratório",
    color: "var(--chart-3)",
    exactKey: "laboratoryExact",
    compactKey: "laboratoryCompact",
    recordsKey: "laboratoryHasRecords",
    reliableKey: "laboratoryReliable",
  },
  {
    key: "fair",
    label: "Feira",
    color: "var(--chart-4)",
    exactKey: "fairExact",
    compactKey: "fairCompact",
    recordsKey: "fairHasRecords",
    reliableKey: "fairReliable",
  },
  {
    key: "total",
    label: "Total",
    color: "var(--chart-1)",
    exactKey: "totalExact",
    compactKey: "totalCompact",
    recordsKey: "totalHasRecords",
    reliableKey: "totalReliable",
  },
];

const periodFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const compactViewportQuery = "(max-width: 600px)";

function subscribeCompactViewport(onChange: () => void) {
  const query = window.matchMedia(compactViewportQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useCompactViewport() {
  return useSyncExternalStore(
    subscribeCompactViewport,
    () => window.matchMedia(compactViewportQuery).matches,
    () => false,
  );
}

export function DashboardFinancialChart({
  points,
  scales,
  year,
  children,
  className,
  qaValidationAvailable,
  unavailable = false,
  unavailableMessage = "Não foi possível consultar os dados financeiros.",
}: {
  points: readonly ChartPoint[];
  scales: Readonly<Record<SeriesKey, string>>;
  year: number;
  children?: ReactNode;
  className?: string;
  qaValidationAvailable: boolean;
  unavailable?: boolean;
  unavailableMessage?: string;
}) {
  const isCompactViewport = useCompactViewport();
  const prefersReducedMotion = usePrefersReducedMotion();
  const gradientId = `dashboard-finance-${useId().replaceAll(":", "")}`;
  const initialSeries = getInitialDashboardFinancialSeries(
    Object.fromEntries(
      series.map((item) => [
        item.key,
        points.some(
          (point) => point[item.recordsKey] && point[item.reliableKey],
        ),
      ]),
    ) as Record<SeriesKey, boolean>,
  );
  const [manualSelectedKey, setManualSelectedKey] = useState<SeriesKey | null>(
    null,
  );
  const [quickViewPoint, setQuickViewPoint] = useState<ChartPoint | null>(null);
  const chartFocusRef = useRef<HTMLElement | null>(null);
  const activePointIndex = useRef<number | null>(null);
  const selectedKey = manualSelectedKey ?? initialSeries;
  const selected =
    series.find((item) => item.key === selectedKey) ?? series[0]!;
  const scale = BigInt(scales[selected.key]);
  const selectedRecordCount = points.filter(
    (point) => point[selected.recordsKey] && point[selected.reliableKey],
  ).length;
  const sparseSeriesMessage =
    selectedRecordCount === 1
      ? "1 competência com lançamento · sem histórico suficiente para indicar evolução."
      : selectedRecordCount === 2
        ? "2 competências com lançamento · a leitura compara apenas os períodos registrados."
        : null;
  const selectedHasUnreliableRecords = points.some(
    (point) => point[selected.recordsKey] && !point[selected.reliableKey],
  );
  const emptyMessage = selectedHasUnreliableRecords
    ? qaValidationAvailable
      ? `Dados de ${selected.label} em revisão. A origem não foi confirmada.`
      : `Dados de ${selected.label} em revisão. A origem não pôde ser validada.`
    : `Sem lançamentos de ${selected.label} em ${year}.`;
  const openPoint = (index: number | undefined) => {
    if (typeof index !== "number" || index < 0 || index >= points.length)
      return;
    activePointIndex.current = index;
    setQuickViewPoint(points[index] ?? null);
  };
  const periodLabel = (month: string) => {
    const formatted = periodFormatter.format(new Date(`${month}-01T12:00:00Z`));
    return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
  };

  const chart = (
    <figure
      ref={chartFocusRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || activePointIndex.current === null) return;
        event.preventDefault();
        openPoint(activePointIndex.current);
      }}
      className={`relative mt-4 h-[var(--dashboard-chart-height-mobile)] w-full min-w-0 sm:h-[var(--dashboard-chart-height)] ${selectedRecordCount <= 2 ? "dashboard-financial-chart-sparse" : ""}`}
      aria-label={`Evolução mensal de ${selected.label} em ${year}, valores em reais e escala linear, ${selectedRecordCount} competências com lançamento`}
      aria-describedby="dashboard-finance-chart-hint"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          accessibilityLayer
          onMouseMove={(state) => {
            activePointIndex.current =
              typeof state.activeTooltipIndex === "number"
                ? state.activeTooltipIndex
                : null;
          }}
          onClick={(state) =>
            openPoint(
              typeof state.activeTooltipIndex === "number"
                ? state.activeTooltipIndex
                : undefined,
            )
          }
          margin={{ top: 12, right: 20, bottom: 2, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={selected.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={selected.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="label"
            tickFormatter={(value: string) =>
              value.replace(/^./, (letter) => letter.toLocaleUpperCase("pt-BR"))
            }
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={isCompactViewport ? 1 : 0}
            tick={(tickProps: XAxisTickContentProps) => {
              const label = String(tickProps.payload.value ?? "");
              const pointIndex = points.findIndex(
                (point) =>
                  point.label.toLocaleLowerCase("pt-BR") ===
                  label.toLocaleLowerCase("pt-BR"),
              );
              const tickLabel = tickProps.tickFormatter
                ? tickProps.tickFormatter(label, pointIndex)
                : label;
              const openTick = () => openPoint(pointIndex);

              return (
                <text
                  x={tickProps.x}
                  y={tickProps.y}
                  textAnchor={tickProps.textAnchor}
                  fill="var(--muted-foreground)"
                  fontSize="12"
                  dominantBaseline="central"
                  role="button"
                  tabIndex={pointIndex < 0 ? -1 : 0}
                  aria-label={`Abrir detalhes de ${label}`}
                  aria-disabled={pointIndex < 0}
                  className="cursor-pointer outline-none focus-visible:fill-foreground"
                  onClick={openTick}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    openTick();
                  }}
                >
                  {tickLabel}
                </text>
              );
            }}
          />
          <YAxis
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: "var(--type-body)",
              fill: "var(--muted-foreground)",
            }}
            tickMargin={8}
            tickCount={5}
            tickFormatter={(value: number) =>
              formatCompactCurrency(currencyChartTickCents(value, scale))
            }
          />
          <Tooltip
            filterNull={false}
            cursor={{
              stroke: "var(--foreground)",
              strokeDasharray: "4 4",
              strokeOpacity: 0.28,
            }}
            reverseDirection={{ y: true }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;
              if (
                unavailable ||
                selectedRecordCount === 0 ||
                !active ||
                !point ||
                !point[selected.reliableKey]
              )
                return null;

              return (
                <div
                  role="tooltip"
                  aria-live="polite"
                  className="box-border w-[min(15rem,calc(100vw-2rem))] -translate-x-3 overflow-hidden rounded-xl border border-[var(--dashboard-tooltip-border)] bg-[var(--dashboard-tooltip-bg)] px-3.5 py-1.5 text-sm text-[var(--dashboard-tooltip-text)] shadow-xl"
                >
                  <p className="text-sm font-medium leading-5 text-[var(--dashboard-tooltip-muted)]">
                    {periodLabel(point.month)}
                  </p>
                  <p className="mt-0.5 text-sm font-medium leading-5">
                    {selected.key === "total"
                      ? "Total consolidado"
                      : selected.label}
                  </p>
                  <p
                    className="mt-0.5 truncate text-base font-semibold leading-5 tabular-nums tracking-tight"
                    title={point[selected.exactKey]}
                    aria-label={
                      point[selected.recordsKey]
                        ? "Valor exato: " + point[selected.exactKey]
                        : "Sem lançamento no período"
                    }
                  >
                    {point[selected.recordsKey]
                      ? point[selected.compactKey]
                      : "Sem lançamento"}
                  </p>
                  {selected.key === "total" && point.totalHasRecords ? (
                    <dl className="mt-1 space-y-0 border-t border-[var(--dashboard-tooltip-border)] pt-1 text-sm leading-5">
                      {series
                        .filter((item) => item.key !== "total")
                        .map((item) => (
                          <div
                            className="flex items-center justify-between gap-3"
                            key={item.key}
                          >
                            <dt className="min-w-0 text-[var(--dashboard-tooltip-muted)]">
                              {item.label}
                            </dt>
                            <dd
                              className="shrink-0 text-right font-medium tabular-nums"
                              title={
                                point[item.recordsKey]
                                  ? point[item.exactKey]
                                  : "Sem lançamento"
                              }
                            >
                              {point[item.recordsKey]
                                ? point[item.compactKey]
                                : "—"}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  ) : null}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={selected.key}
            name={selected.label}
            stroke={selected.color}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${gradientId})`}
            dot={
              selectedRecordCount <= 2
                ? {
                    r: 4,
                    fill: selected.color,
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }
                : false
            }
            activeDot={(dot: ActiveDotProps) => {
              const point = points[dot.index];
              return (
                <g
                  transform={`translate(${dot.cx ?? 0},${dot.cy ?? 0})`}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    point
                      ? `Abrir detalhes de ${periodLabel(point.month)}`
                      : "Abrir detalhes da competência"
                  }
                  className="cursor-pointer outline-none"
                  onClick={() => openPoint(dot.index)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    openPoint(dot.index);
                  }}
                >
                  <circle r={12} fill="transparent" />
                  <circle
                    r={6}
                    fill={selected.color}
                    stroke="var(--card)"
                    strokeWidth={3}
                    pointerEvents="none"
                  />
                </g>
              );
            }}
            connectNulls={false}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={450}
          />
        </AreaChart>
      </ResponsiveContainer>
      {selectedRecordCount === 0 || unavailable ? (
        <p
          role={unavailable ? "alert" : "status"}
          className="pointer-events-none absolute inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-xl border border-border/70 bg-card/90 px-4 py-3 text-center text-sm leading-5 text-muted-foreground shadow-sm"
        >
          {unavailable ? unavailableMessage : emptyMessage}
        </p>
      ) : null}
      <figcaption className="sr-only">
        Série mensal de {selected.label} no ano de {year}. Meses sem lançamentos
        são exibidos como lacunas; valores exatos estão disponíveis ao
        focalizar, tocar ou apontar os meses.
      </figcaption>
      <p id="dashboard-finance-chart-hint" className="sr-only">
        Selecione um ponto do gráfico para abrir os detalhes da competência.
      </p>
    </figure>
  );

  return (
    <section
      className={`dashboard-financial-chart dashboard-surface min-w-0 p-[var(--dashboard-panel-padding-wide)] sm:p-[var(--dashboard-panel-padding)] lg:p-[var(--dashboard-panel-padding-wide)] ${className ?? ""}`}
    >
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-6 tracking-tight text-foreground">
            Evolução Financeira
          </h2>
          <p className="mt-[var(--space-1)] text-sm leading-5 text-muted-foreground">
            {selected.label} · {year}
          </p>
        </div>

        <div
          className="flex w-full flex-wrap gap-0.5 rounded-[var(--radius-control)] bg-muted/70 p-1 sm:w-auto md:flex-nowrap md:shrink-0"
          role="group"
          aria-label="Selecionar série financeira"
        >
          {series.map((item) => {
            const active = selectedKey === item.key;

            return (
              <Button
                key={item.key}
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={active}
                onClick={() => setManualSelectedKey(item.key)}
                className={`min-h-11 touch-manipulation rounded-lg px-3 transition-colors duration-150 max-sm:px-2 max-sm:text-xs md:shrink-0 ${
                  active
                    ? "bg-card font-semibold text-foreground shadow-sm hover:bg-card"
                    : ""
                }`}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
      </header>

      {children ? (
        <div className="mt-2 flex justify-end">{children}</div>
      ) : null}

      <DashboardSeriesPresentation
        points={points.map((point) => ({
          label: periodLabel(point.month),
          value: point[selected.compactKey],
          detail: point[selected.reliableKey]
            ? `${selected.label} · Valor exato: ${point[selected.exactKey]}`
            : "Há lançamentos em revisão de qualidade.",
          hasRecords: point[selected.recordsKey] && point[selected.reliableKey],
        }))}
        emptyMessage={emptyMessage}
        chart={chart}
        alwaysChart
      />
      {sparseSeriesMessage ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {sparseSeriesMessage}
        </p>
      ) : null}
      <DashboardQuickViewDialog
        open={quickViewPoint !== null}
        onOpenChange={(open) => {
          if (!open) setQuickViewPoint(null);
        }}
        finalFocusRef={chartFocusRef}
        title={
          quickViewPoint ? periodLabel(quickViewPoint.month) : "Financeiro"
        }
        period={`Ano ${year}`}
        description={
          quickViewPoint &&
          quickViewPoint[selected.recordsKey] &&
          !quickViewPoint[selected.reliableKey]
            ? "O total deste período está em revisão de origem; não é apresentado como valor confiável."
            : selected.key === "total"
              ? "Resumo financeiro consolidado da competência."
              : `Resumo de ${selected.label} na competência.`
        }
        primaryLabel={
          selected.key === "total" ? "Total consolidado" : selected.label
        }
        primaryValue={
          !quickViewPoint
            ? undefined
            : !quickViewPoint[selected.reliableKey]
              ? "Em revisão"
              : quickViewPoint[selected.recordsKey]
                ? quickViewPoint[selected.compactKey]
                : "Sem lançamentos"
        }
        primaryExactValue={
          quickViewPoint?.[selected.reliableKey] &&
          quickViewPoint[selected.recordsKey]
            ? quickViewPoint[selected.exactKey]
            : undefined
        }
        details={
          quickViewPoint
            ? series
                .filter((item) => item.key !== "total")
                .map((item) => ({
                  label: item.label,
                  value: !quickViewPoint[item.reliableKey]
                    ? "Em revisão"
                    : quickViewPoint[item.recordsKey]
                      ? quickViewPoint[item.compactKey]
                      : "Sem lançamento",
                  ...(quickViewPoint[item.reliableKey] &&
                  quickViewPoint[item.recordsKey]
                    ? { exactValue: quickViewPoint[item.exactKey] }
                    : {}),
                }))
            : []
        }
        href="/financeiro"
        hrefLabel="Abrir Financeiro"
      />
    </section>
  );
}
