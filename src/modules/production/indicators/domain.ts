import type { ProductionIndicatorEntry } from "../repository";
import type { ProductionIndicatorFilters } from "./validation";

export type ProductionVolume = Readonly<{
  key: string;
  procedureId: string;
  procedureName: string;
  categoryId: string;
  categoryName: string;
  countingUnit: string;
  source: string;
  quantity: number;
  recordCount: number;
}>;

export type ProductionCategoryGroup = Readonly<{
  categoryId: string;
  categoryName: string;
  procedures: readonly ProductionVolume[];
}>;

export type ProductionMonthlyPoint = Readonly<{
  competence: string;
  label: string;
  quantity: number | null;
  hasRecords: boolean;
}>;

export type ProductionMonthlySeries = Readonly<{
  key: string;
  procedureId: string;
  procedureName: string;
  countingUnit: string;
  source: string;
  points: readonly ProductionMonthlyPoint[];
}>;

export type ProductionComparison = Readonly<{
  key: string;
  source: string;
  countingUnit: string;
  currentQuantity: number | null;
  previousQuantity: number | null;
  currentRecordCount: number;
  previousRecordCount: number;
}>;

export type ProductionVariation = Readonly<{
  key: string;
  competence: string;
  previousCompetence: string | null;
  procedureName: string;
  categoryName: string;
  countingUnit: string;
  source: string;
  quantity: number;
  previousQuantity: number | null;
  variation: number | null;
}>;

type ComparisonWindow = Readonly<{
  label: string;
  previousLabel: string;
  currentFrom: string;
  currentTo: string;
  previousFrom: string;
  previousTo: string;
}>;

function uniqueEntries(
  entries: readonly ProductionIndicatorEntry[],
): ProductionIndicatorEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return [...byId.values()];
}

function monthToOrdinal(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return year * 12 + monthNumber - 1;
}

function ordinalToMonth(ordinal: number): string {
  const year = Math.floor(ordinal / 12);
  const month = (ordinal % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function getSelectedRange(
  filters: ProductionIndicatorFilters,
): Readonly<{ from: string; to: string }> {
  if (filters.mode === "competencia") {
    return { from: filters.competence, to: filters.competence };
  }
  if (filters.mode === "ano") {
    return { from: `${filters.year}-01`, to: `${filters.year}-12` };
  }
  return { from: filters.from, to: filters.to };
}

export function normalizeProductionSource(source: string): string {
  return source.trim().toLowerCase();
}

function matchesDimensions(
  entry: ProductionIndicatorEntry,
  filters: ProductionIndicatorFilters,
  procedureId = filters.procedureId,
): boolean {
  return (
    (!filters.categoryId || entry.category_id === filters.categoryId) &&
    (!procedureId || entry.procedure_id === procedureId) &&
    (!filters.source ||
      normalizeProductionSource(entry.source) ===
        normalizeProductionSource(filters.source))
  );
}

export function filterProductionEntries(
  entries: readonly ProductionIndicatorEntry[],
  filters: ProductionIndicatorFilters,
): ProductionIndicatorEntry[] {
  const { from, to } = getSelectedRange(filters);
  return uniqueEntries(entries).filter((entry) => {
    const competence = entry.reference_period.slice(0, 7);
    return (
      competence >= from &&
      competence <= to &&
      matchesDimensions(entry, filters)
    );
  });
}

function buildVolumes(
  entries: readonly ProductionIndicatorEntry[],
): ProductionVolume[] {
  const volumes = new Map<string, ProductionVolume>();
  for (const entry of uniqueEntries(entries)) {
    const key = JSON.stringify([
      entry.procedure_id,
      entry.counting_unit,
      normalizeProductionSource(entry.source),
    ]);
    const current = volumes.get(key);
    volumes.set(key, {
      key,
      procedureId: entry.procedure_id,
      procedureName: entry.procedure_name,
      categoryId: entry.category_id,
      categoryName: entry.category_name,
      countingUnit: entry.counting_unit,
      source: entry.source,
      quantity: (current?.quantity ?? 0) + Number(entry.quantity),
      recordCount: (current?.recordCount ?? 0) + 1,
    });
  }
  return [...volumes.values()].sort(
    (left, right) =>
      right.quantity - left.quantity ||
      left.procedureName.localeCompare(right.procedureName, "pt-BR") ||
      left.source.localeCompare(right.source, "pt-BR"),
  );
}

export function buildProductionVolumeRanking(
  entries: readonly ProductionIndicatorEntry[],
): ProductionVolume[] {
  return buildVolumes(entries);
}

export function groupProductionByCategory(
  entries: readonly ProductionIndicatorEntry[],
): ProductionCategoryGroup[] {
  const categories = new Map<string, ProductionVolume[]>();
  for (const volume of buildVolumes(entries)) {
    const group = categories.get(volume.categoryId) ?? [];
    group.push(volume);
    categories.set(volume.categoryId, group);
  }
  return [...categories.entries()]
    .map(([categoryId, procedures]) => ({
      categoryId,
      categoryName: procedures[0]?.categoryName ?? "Categoria indisponível",
      procedures,
    }))
    .sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
    );
}

export function buildProductionMonthlyEvolution(
  entries: readonly ProductionIndicatorEntry[],
  filters: ProductionIndicatorFilters,
): ProductionMonthlySeries[] {
  if (!filters.procedureId) return [];
  const { from, to } = getSelectedRange(filters);
  const chartFrom =
    filters.mode === "competencia"
      ? ordinalToMonth(monthToOrdinal(filters.competence) - 11)
      : from;
  const dimensionEntries = uniqueEntries(entries).filter((entry) =>
    matchesDimensions(entry, filters, filters.procedureId),
  );
  const volumes = buildVolumes(dimensionEntries);
  const months = Array.from(
    { length: monthToOrdinal(to) - monthToOrdinal(chartFrom) + 1 },
    (_, index) => ordinalToMonth(monthToOrdinal(chartFrom) + index),
  );

  return volumes.flatMap((volume) => {
    const byMonth = new Map<string, number>();
    for (const entry of dimensionEntries) {
      if (
        entry.counting_unit !== volume.countingUnit ||
        normalizeProductionSource(entry.source) !==
          normalizeProductionSource(volume.source)
      ) {
        continue;
      }
      const month = entry.reference_period.slice(0, 7);
      if (month < chartFrom || month > to) continue;
      byMonth.set(month, (byMonth.get(month) ?? 0) + Number(entry.quantity));
    }
    if (!months.some((month) => byMonth.has(month))) return [];
    return [
      {
        key: volume.key,
        procedureId: volume.procedureId,
        procedureName: volume.procedureName,
        countingUnit: volume.countingUnit,
        source: volume.source,
        points: months.map((competence) => {
          const hasRecords = byMonth.has(competence);
          return {
            competence,
            label: monthLabel(competence),
            quantity: hasRecords ? (byMonth.get(competence) ?? 0) : null,
            hasRecords,
          };
        }),
      },
    ];
  });
}

function compareWindows(
  entries: readonly ProductionIndicatorEntry[],
  procedureId: string,
  filters: ProductionIndicatorFilters,
  window: ComparisonWindow,
): ProductionComparison[] {
  const rows = uniqueEntries(entries).filter((entry) =>
    matchesDimensions(entry, filters, procedureId),
  );
  const currentEntries = rows.filter((entry) => {
    const month = entry.reference_period.slice(0, 7);
    return month >= window.currentFrom && month <= window.currentTo;
  });
  const previousEntries = rows.filter((entry) => {
    const month = entry.reference_period.slice(0, 7);
    return month >= window.previousFrom && month <= window.previousTo;
  });
  const keys = new Map<string, { source: string; unit: string }>();
  for (const entry of [...currentEntries, ...previousEntries]) {
    const key = JSON.stringify([
      normalizeProductionSource(entry.source),
      entry.counting_unit,
    ]);
    keys.set(key, { source: entry.source, unit: entry.counting_unit });
  }
  return [...keys.entries()]
    .map(([key, dimensions]) => {
      const current = currentEntries.filter(
        (entry) =>
          normalizeProductionSource(entry.source) ===
            normalizeProductionSource(dimensions.source) &&
          entry.counting_unit === dimensions.unit,
      );
      const previous = previousEntries.filter(
        (entry) =>
          normalizeProductionSource(entry.source) ===
            normalizeProductionSource(dimensions.source) &&
          entry.counting_unit === dimensions.unit,
      );
      return {
        key,
        source: dimensions.source,
        countingUnit: dimensions.unit,
        currentQuantity: current.length
          ? current.reduce((sum, entry) => sum + Number(entry.quantity), 0)
          : null,
        previousQuantity: previous.length
          ? previous.reduce((sum, entry) => sum + Number(entry.quantity), 0)
          : null,
        currentRecordCount: current.length,
        previousRecordCount: previous.length,
      };
    })
    .sort(
      (left, right) =>
        left.source.localeCompare(right.source, "pt-BR") ||
        left.countingUnit.localeCompare(right.countingUnit, "pt-BR"),
    );
}

function shiftMonth(month: string, offset: number): string {
  return ordinalToMonth(monthToOrdinal(month) + offset);
}

export function buildProductionComparisons(
  entries: readonly ProductionIndicatorEntry[],
  filters: ProductionIndicatorFilters,
): Readonly<{
  monthOverMonth: readonly ProductionComparison[];
  equivalentCompetence: readonly ProductionComparison[];
  yearOverYear: readonly ProductionComparison[];
}> {
  if (!filters.procedureId) {
    return { monthOverMonth: [], equivalentCompetence: [], yearOverYear: [] };
  }
  if (filters.mode === "competencia") {
    const month = filters.competence;
    const monthOverMonth = compareWindows(
      entries,
      filters.procedureId,
      filters,
      {
        label: month,
        previousLabel: shiftMonth(month, -1),
        currentFrom: month,
        currentTo: month,
        previousFrom: shiftMonth(month, -1),
        previousTo: shiftMonth(month, -1),
      },
    );
    const previousYear = `${Number(month.slice(0, 4)) - 1}-${month.slice(5, 7)}`;
    const equivalentCompetence = compareWindows(
      entries,
      filters.procedureId,
      filters,
      {
        label: month,
        previousLabel: previousYear,
        currentFrom: month,
        currentTo: month,
        previousFrom: previousYear,
        previousTo: previousYear,
      },
    );
    return {
      monthOverMonth,
      equivalentCompetence,
      yearOverYear: [],
    };
  }
  if (filters.mode === "ano") {
    const previousYear = String(Number(filters.year) - 1);
    return {
      monthOverMonth: [],
      equivalentCompetence: [],
      yearOverYear: compareWindows(entries, filters.procedureId, filters, {
        label: filters.year,
        previousLabel: previousYear,
        currentFrom: `${filters.year}-01`,
        currentTo: `${filters.year}-12`,
        previousFrom: `${previousYear}-01`,
        previousTo: `${previousYear}-12`,
      }),
    };
  }
  return { monthOverMonth: [], equivalentCompetence: [], yearOverYear: [] };
}

export function buildProductionHistoryVariations(
  entries: readonly ProductionIndicatorEntry[],
  filters: ProductionIndicatorFilters,
): ProductionVariation[] {
  if (!filters.procedureId) return [];
  const { from, to } = getSelectedRange(filters);
  const selectedEntries = filterProductionEntries(entries, filters);
  const volumes = buildVolumes(selectedEntries);
  const result: ProductionVariation[] = [];
  for (const volume of volumes) {
    const series = uniqueEntries(entries)
      .filter(
        (entry) =>
          entry.procedure_id === volume.procedureId &&
          normalizeProductionSource(entry.source) ===
            normalizeProductionSource(volume.source) &&
          entry.counting_unit === volume.countingUnit,
      )
      .sort((left, right) =>
        left.reference_period.localeCompare(right.reference_period),
      );
    const baseline = series
      .filter((entry) => entry.reference_period.slice(0, 7) < from)
      .at(-1);
    let previous: ProductionIndicatorEntry | undefined = baseline;
    for (const entry of series.filter((row) => {
      const month = row.reference_period.slice(0, 7);
      return month >= from && month <= to;
    })) {
      const quantity = Number(entry.quantity);
      result.push({
        key: `${volume.key}:${entry.reference_period}`,
        competence: entry.reference_period.slice(0, 7),
        previousCompetence: previous?.reference_period.slice(0, 7) ?? null,
        procedureName: entry.procedure_name,
        categoryName: entry.category_name,
        countingUnit: entry.counting_unit,
        source: entry.source,
        quantity,
        previousQuantity: previous ? Number(previous.quantity) : null,
        variation:
          previous === undefined ? null : quantity - Number(previous.quantity),
      });
      previous = entry;
    }
  }
  return result.sort((left, right) =>
    right.competence.localeCompare(left.competence),
  );
}

export function buildProductionIndicatorData(
  entries: readonly ProductionIndicatorEntry[],
  filters: ProductionIndicatorFilters,
) {
  const periodEntries = filterProductionEntries(entries, filters);
  return {
    periodEntries,
    volumeRanking: buildProductionVolumeRanking(periodEntries),
    categoryGroups: groupProductionByCategory(periodEntries),
    monthlyEvolution: buildProductionMonthlyEvolution(entries, filters),
    comparisons: buildProductionComparisons(entries, filters),
    variations: buildProductionHistoryVariations(entries, filters),
    recordCount: periodEntries.length,
    procedureCount: new Set(periodEntries.map((entry) => entry.procedure_id))
      .size,
  };
}
