import type { ReactNode } from "react";

export type DashboardSeriesPoint = Readonly<{
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  hasRecords: boolean;
}>;

export type DashboardSeriesMode = "empty" | "summary" | "comparison" | "chart";

export function getDashboardSeriesMode(
  points: readonly Pick<DashboardSeriesPoint, "hasRecords">[],
  alwaysChart = false,
): DashboardSeriesMode {
  if (alwaysChart) return "chart";

  const recordedPeriods = points.filter((point) => point.hasRecords).length;
  if (recordedPeriods === 0) return "empty";
  if (recordedPeriods === 1) return "summary";
  if (recordedPeriods === 2) return "comparison";
  return "chart";
}

export function DashboardSeriesPresentation({
  points,
  emptyMessage,
  chart,
  alwaysChart = false,
}: {
  points: readonly DashboardSeriesPoint[];
  emptyMessage: string;
  chart: ReactNode;
  alwaysChart?: boolean;
}) {
  const mode = getDashboardSeriesMode(points, alwaysChart);
  const recordedPoints = points.filter((point) => point.hasRecords);

  if (mode === "empty") {
    return (
      <p
        role="status"
        data-series-mode="empty"
        className="py-4 text-sm text-muted-foreground"
      >
        {emptyMessage}
      </p>
    );
  }

  if (mode === "chart") {
    return <div data-series-mode="chart">{chart}</div>;
  }

  return (
    <dl
      data-series-mode={mode}
      aria-label={
        mode === "summary" ? "Resumo do período" : "Comparação dos períodos"
      }
      className={`grid gap-3 ${mode === "comparison" ? "sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {recordedPoints.map((point) => (
        <div key={point.label} className="min-w-0 py-2">
          <dt className="text-sm font-medium capitalize text-muted-foreground">
            {point.label}
          </dt>
          <dd
            className={`mt-1 font-semibold leading-tight tracking-tight text-foreground tabular-nums ${
              mode === "comparison"
                ? "whitespace-nowrap text-[length:var(--dashboard-comparison-value)]"
                : "text-[length:var(--type-metric)]"
            }`}
          >
            {point.value}
          </dd>
          {point.detail ? (
            <dd className="mt-1 text-sm text-muted-foreground">
              {point.detail}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
