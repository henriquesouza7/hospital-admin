export type DashboardFinancialSeries =
  "pharmacy" | "laboratory" | "fair" | "total";

const dashboardFinancialSeriesPreference: readonly DashboardFinancialSeries[] =
  ["total", "pharmacy", "laboratory", "fair"];

export function getInitialDashboardFinancialSeries(
  availableSeries: Readonly<Record<DashboardFinancialSeries, boolean>>,
): DashboardFinancialSeries {
  return (
    dashboardFinancialSeriesPreference.find(
      (series) => availableSeries[series],
    ) ?? "total"
  );
}
