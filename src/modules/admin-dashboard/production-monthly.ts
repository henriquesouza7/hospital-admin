import { monthName } from "./domain";

export type DashboardProductionEntry = Readonly<{
  counting_unit: string;
  quantity: string;
  procedure_name?: string;
  reference_period: string;
  source: string;
}>;

export type DashboardProductionDimension = Readonly<{
  key: string;
  label: string;
  unit: string;
  source: string;
}>;

export type DashboardProductionMonth = Readonly<{
  month: number;
  label: string;
  longLabel: string;
  isAfterSelected: boolean;
  isCurrentPartial: boolean;
  values: Readonly<
    Record<
      string,
      Readonly<{ quantity: number | null; exact: string; hasRecords: boolean }>
    >
  >;
}>;

export type DashboardProductionMonthlyData = Readonly<{
  dimensions: readonly DashboardProductionDimension[];
  months: readonly DashboardProductionMonth[];
  averages: readonly Readonly<{ value: string; dimension: string }>[];
  yearComparisons: readonly Readonly<{
    current: string;
    previous: string;
    dimension: string;
  }>[];
}>;

export function buildDashboardProductionMonthlyData(
  entries: readonly DashboardProductionEntry[],
  year: number,
  selectedMonth: number,
  currentCompetence: string,
): DashboardProductionMonthlyData {
  const yearPrefix = `${year}-`;
  const visibleEntries = entries.filter(
    (entry) =>
      entry.reference_period.startsWith(yearPrefix) &&
      Number(entry.reference_period.slice(5, 7)) <= selectedMonth,
  );
  const dimensionsByKey = new Map<string, DashboardProductionDimension>();
  for (const entry of visibleEntries) {
    const key = JSON.stringify([entry.counting_unit, entry.source]);
    dimensionsByKey.set(key, {
      key,
      label: `${entry.counting_unit} · ${entry.source}`,
      unit: entry.counting_unit,
      source: entry.source,
    });
  }
  const dimensions = [...dimensionsByKey.values()].sort(
    (left, right) =>
      left.unit.localeCompare(right.unit, "pt-BR") ||
      left.source.localeCompare(right.source, "pt-BR"),
  );
  const monthRows = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const competence = `${year}-${String(month).padStart(2, "0")}`;
    const rows = visibleEntries.filter(
      (entry) => entry.reference_period.slice(0, 7) === competence,
    );
    const values = Object.fromEntries(
      dimensions.map((dimension) => {
        const matching = rows.filter(
          (entry) =>
            entry.counting_unit === dimension.unit &&
            entry.source === dimension.source,
        );
        const hasRecords = matching.length > 0;
        const exact = matching.reduce(
          (sum, entry) => sum + BigInt(entry.quantity),
          BigInt(0),
        );
        return [
          dimension.key,
          {
            quantity: hasRecords ? Number(exact) : null,
            exact: new Intl.NumberFormat("pt-BR", {
              maximumFractionDigits: 0,
            }).format(exact),
            hasRecords,
          },
        ];
      }),
    );

    return {
      month,
      label: monthName(month),
      longLabel: new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(2020, month - 1, 1))),
      isAfterSelected: month > selectedMonth,
      isCurrentPartial: competence === currentCompetence,
      values,
    };
  });

  const averages = dimensions.flatMap((dimension) => {
    const fullRecordedMonths = monthRows.filter(
      (month) =>
        month.month <= selectedMonth &&
        !month.isCurrentPartial &&
        month.values[dimension.key]?.hasRecords,
    );
    if (!fullRecordedMonths.length) return [];
    const value = new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(
      fullRecordedMonths.reduce(
        (sum, month) => sum + (month.values[dimension.key]?.quantity ?? 0),
        0,
      ) / fullRecordedMonths.length,
    );
    return [{ dimension: dimension.label, value }];
  });
  const yearComparisons = dimensions.flatMap((dimension) => {
    const currentRows = visibleEntries.filter(
      (entry) =>
        entry.counting_unit === dimension.unit &&
        entry.source === dimension.source,
    );
    const previousRows = entries.filter((entry) => {
      const month = Number(entry.reference_period.slice(5, 7));
      return (
        entry.reference_period.startsWith(`${year - 1}-`) &&
        month <= selectedMonth &&
        entry.counting_unit === dimension.unit &&
        entry.source === dimension.source
      );
    });
    if (!currentRows.length || !previousRows.length) return [];
    const formatQuantity = (rows: readonly DashboardProductionEntry[]) =>
      new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
        rows.reduce((sum, entry) => sum + BigInt(entry.quantity), BigInt(0)),
      );
    return [
      {
        current: formatQuantity(currentRows),
        previous: formatQuantity(previousRows),
        dimension: dimension.label,
      },
    ];
  });

  return { dimensions, months: monthRows, averages, yearComparisons };
}
