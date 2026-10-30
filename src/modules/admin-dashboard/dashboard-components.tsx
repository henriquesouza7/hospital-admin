import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getResponsiveMetricPresentation } from "../../lib/responsive-metric";
import { DashboardQuickView } from "./dashboard-quick-view";

export type DashboardMetricContext = Readonly<{
  label: string;
  value: string;
  exactValue?: string;
}>;

export type DashboardMetricTrendPoint = Readonly<{
  label: string;
  value: number | null;
  compactValue?: string;
  exactValue?: string;
}>;

function getSparklinePaths(points: readonly DashboardMetricTrendPoint[]) {
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  if (values.length < 6 || values.every((value) => value === 0)) return [];

  const minimum = Math.min(...values);
  const range = Math.max(...values) - minimum || 1;
  const position = (index: number, value: number) => ({
    x: (index / Math.max(1, points.length - 1)) * 100,
    y: 28 - ((value - minimum) / range) * 24,
  });
  const runs: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];

  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length >= 6) runs.push(current);
      current = [];
      return;
    }
    current.push(position(index, point.value));
  });
  if (current.length >= 6) runs.push(current);

  return runs.map((run) => {
    let line = `M ${run[0].x} ${run[0].y}`;
    for (let index = 1; index < run.length; index += 1) {
      const previous = run[index - 1];
      const next = run[index];
      const middle = (previous.x + next.x) / 2;
      line += ` C ${middle} ${previous.y}, ${middle} ${next.y}, ${next.x} ${next.y}`;
    }
    return {
      line,
      area: `${line} L ${run.at(-1)?.x ?? 100} 32 L ${run[0].x} 32 Z`,
    };
  });
}

type DashboardModuleLinkProps = Readonly<{
  href: string;
  title: string;
  icon: LucideIcon;
  className?: string;
  metricLabel: string;
  metricValue: string;
  metricExactValue?: string;
  metricDetail: string;
  metricPeriod?: string;
  metricContext?: readonly DashboardMetricContext[];
  metricTrend?: readonly DashboardMetricTrendPoint[];
}>;

export function getDashboardMetricPresentation(value: string) {
  const presentation = getResponsiveMetricPresentation(value);
  const needsFit =
    presentation.isLong || (value.startsWith("R$") && value.length > 9);

  return {
    ...presentation,
    isLong: needsFit,
    className: needsFit ? "whitespace-nowrap" : "text-3xl",
    style: needsFit
      ? (presentation.style ?? {
          fontSize: `clamp(1rem, calc(100cqi / ${value.length} / 0.6), 2.25rem)`,
        })
      : presentation.style,
  };
}

export function DashboardModuleLink({
  href,
  title,
  icon: Icon,
  className,
  metricLabel,
  metricValue,
  metricExactValue,
  metricDetail,
  metricPeriod,
  metricContext,
  metricTrend,
}: DashboardModuleLinkProps) {
  const metricPresentation = getDashboardMetricPresentation(metricValue);
  const sparklinePaths = getSparklinePaths(metricTrend ?? []);

  return (
    <article
      className={`dashboard-surface dashboard-module-card relative flex min-w-0 flex-col px-[var(--dashboard-kpi-padding-compact)] py-[var(--dashboard-kpi-padding)] sm:p-[var(--dashboard-kpi-padding)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-muted/20 motion-reduce:transition-none ${className ?? ""}`}
      data-module={title}
    >
      <DashboardQuickView
        title={title}
        description={metricDetail}
        period={metricPeriod}
        primaryLabel={metricLabel}
        primaryValue={metricPresentation.value}
        primaryExactValue={metricExactValue ?? metricPresentation.title}
        details={metricContext ?? []}
        href={href}
        hrefLabel={`Abrir ${title}`}
        triggerLabel={`Ver resumo de ${title}`}
        triggerClassName="dashboard-module-trigger group/module relative flex w-full min-w-0 flex-1 flex-col rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        trigger={
          <>
            <div className="dashboard-module-heading relative flex min-h-11 min-w-0 items-center gap-2 pr-8">
              <span className="dashboard-module-icon-wrap">
                <Icon
                  aria-hidden="true"
                  className="dashboard-module-icon size-4 shrink-0"
                  strokeWidth={1.8}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="dashboard-module-title line-clamp-2 block text-[length:var(--dashboard-kpi-title-size)] font-semibold leading-5 tracking-tight text-muted-foreground transition-colors group-hover/module:text-foreground">
                  {title}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="absolute right-1 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-[var(--motion-fast)] group-hover/module:translate-x-0.5 motion-reduce:transition-none"
              />
            </div>

            <div className="dashboard-module-metric-content mt-[var(--space-4)] min-w-0">
              <p className="dashboard-module-metric-label sr-only">
                {metricLabel}
              </p>
              <p
                className={`dashboard-module-metric-value w-full font-semibold leading-[1.1] tracking-tight text-foreground tabular-nums ${metricPresentation.isLong ? metricPresentation.className : "text-[length:var(--dashboard-kpi-value)]"}`}
                style={metricPresentation.style}
                title={metricExactValue ?? metricPresentation.title}
              >
                {metricPresentation.value}
              </p>
              <p
                className="mt-[var(--space-1)] line-clamp-2 text-sm leading-[var(--dashboard-body-leading-compact)] text-muted-foreground"
                title={metricDetail}
              >
                {metricDetail}
              </p>
            </div>
            {sparklinePaths.length > 0 ? (
              <svg
                className="dashboard-module-sparkline"
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {sparklinePaths.map((path, index) => (
                  <g key={index}>
                    <path
                      d={path.area}
                      className="dashboard-module-sparkline-area"
                    />
                    <path
                      d={path.line}
                      className="dashboard-module-sparkline-line"
                    />
                  </g>
                ))}
              </svg>
            ) : null}
          </>
        }
      />
    </article>
  );
}

type DashboardQuickLinkProps = Readonly<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

export function DashboardQuickLink({
  href,
  label,
  icon: Icon,
}: DashboardQuickLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
    >
      <Icon aria-hidden="true" className="size-4 text-link" />
      {label}
    </Link>
  );
}
