import { describe, expect, it } from "vitest";
import type { ProductionIndicatorEntry } from "../repository";
import { buildProductionIndicatorData } from "./domain";
import type { ProductionIndicatorFilters } from "./validation";

const procedureA = "00000000-0000-4000-8000-000000000001";
const procedureB = "00000000-0000-4000-8000-000000000002";
const categoryA = "00000000-0000-4000-8000-000000000101";
const categoryB = "00000000-0000-4000-8000-000000000102";

function entry(
  id: string,
  values: Partial<ProductionIndicatorEntry> = {},
): ProductionIndicatorEntry {
  return {
    id: `00000000-0000-4000-8000-${id.padStart(12, "0")}`,
    procedure_id: procedureA,
    procedure_name: "Hemograma",
    category_id: categoryA,
    category_name: "Laboratório",
    counting_unit: "exames",
    reference_period: "2026-04-01",
    quantity: "10",
    source: "realizado",
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...values,
  };
}

function filters(
  values: Partial<ProductionIndicatorFilters> = {},
): ProductionIndicatorFilters {
  return {
    mode: "competencia",
    competence: "2026-04",
    from: "2026-04",
    to: "2026-04",
    year: "2026",
    categoryId: "",
    procedureId: procedureA,
    source: "",
    ...values,
  };
}

describe("production indicator calculations", () => {
  it("should_filter_records_by_competence_procedure_category_and_source", () => {
    const result = buildProductionIndicatorData(
      [
        entry("1", { quantity: "4" }),
        entry("2", { source: "aprovado", quantity: "99" }),
        entry("3", { reference_period: "2026-03-01", quantity: "99" }),
        entry("4", { procedure_id: procedureB, quantity: "99" }),
        entry("5", { category_id: categoryB, quantity: "99" }),
      ],
      filters({ categoryId: categoryA, source: "realizado" }),
    );
    expect(result.periodEntries.map((row) => row.id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
    ]);
    expect(result.volumeRanking[0]?.quantity).toBe(4);
  });

  it("should_compare_selected_competence_to_previous_month_and_equivalent_month", () => {
    const result = buildProductionIndicatorData(
      [
        entry("1", { reference_period: "2026-04-01", quantity: "12" }),
        entry("2", { reference_period: "2026-03-01", quantity: "8" }),
        entry("3", { reference_period: "2025-04-01", quantity: "10" }),
      ],
      filters(),
    );
    expect(result.comparisons.monthOverMonth[0]).toMatchObject({
      currentQuantity: 12,
      previousQuantity: 8,
    });
    expect(result.comparisons.equivalentCompetence[0]).toMatchObject({
      currentQuantity: 12,
      previousQuantity: 10,
    });
  });

  it("should_compare_annual_totals_without_combining_sources_or_units", () => {
    const result = buildProductionIndicatorData(
      [
        entry("1", { reference_period: "2026-01-01", quantity: "12" }),
        entry("2", {
          reference_period: "2026-02-01",
          counting_unit: "atendimentos",
          quantity: "3",
        }),
        entry("3", { reference_period: "2025-01-01", quantity: "7" }),
        entry("4", {
          reference_period: "2025-02-01",
          source: "apresentado",
          quantity: "100",
        }),
      ],
      filters({ mode: "ano", year: "2026" }),
    );
    expect(result.comparisons.yearOverYear).toHaveLength(3);
    expect(result.comparisons.yearOverYear).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "realizado",
          countingUnit: "exames",
          currentQuantity: 12,
          previousQuantity: 7,
        }),
        expect.objectContaining({
          source: "realizado",
          countingUnit: "atendimentos",
          currentQuantity: 3,
          previousQuantity: null,
        }),
        expect.objectContaining({
          source: "apresentado",
          countingUnit: "exames",
          currentQuantity: null,
          previousQuantity: 100,
        }),
      ]),
    );
  });

  it("should_keep_historical_units_and_sources_as_separate_monthly_series", () => {
    const result = buildProductionIndicatorData(
      [
        entry("1", {
          reference_period: "2026-04-01",
          counting_unit: "exames",
          quantity: "5",
        }),
        entry("2", {
          reference_period: "2026-04-01",
          counting_unit: "procedimentos",
          quantity: "2",
        }),
        entry("3", {
          reference_period: "2026-04-01",
          source: "aprovado",
          quantity: "9",
        }),
      ],
      filters(),
    );
    expect(result.monthlyEvolution).toHaveLength(3);
    expect(
      result.monthlyEvolution.map((series) => [
        series.countingUnit,
        series.source,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["exames", "realizado"],
        ["procedimentos", "realizado"],
        ["exames", "aprovado"],
      ]),
    );
    expect(
      result.monthlyEvolution
        .find(
          (series) =>
            series.countingUnit === "exames" && series.source === "realizado",
        )
        ?.points.at(-1),
    ).toMatchObject({ quantity: 5, hasRecords: true });
  });

  it("should_not_count_the_same_persisted_entry_twice_in_history_or_ranking", () => {
    const repeated = entry("1", { quantity: "10" });
    const result = buildProductionIndicatorData(
      [
        repeated,
        repeated,
        entry("2", {
          reference_period: "2026-03-01",
          quantity: "7",
        }),
      ],
      filters(),
    );
    expect(result.volumeRanking[0]).toMatchObject({
      quantity: 10,
      recordCount: 1,
    });
    expect(result.variations).toHaveLength(2);
    expect(result.variations[0]).toMatchObject({
      competence: "2026-04",
      previousQuantity: 7,
      variation: 3,
    });
  });

  it("should_keep_procedures_separate_inside_category_groups", () => {
    const result = buildProductionIndicatorData(
      [
        entry("1", { quantity: "12" }),
        entry("2", {
          procedure_id: procedureB,
          procedure_name: "Glicemia",
          quantity: "40",
        }),
      ],
      filters({ procedureId: "", categoryId: "" }),
    );
    expect(result.volumeRanking.map((volume) => volume.quantity)).toEqual([
      40, 12,
    ]);
    expect(result.categoryGroups[0]?.procedures).toHaveLength(2);
    expect(
      result.categoryGroups[0]?.procedures.map((row) => row.quantity),
    ).toEqual([40, 12]);
  });

  it("should_represent_empty_data_without_inventing_zero_records", () => {
    const result = buildProductionIndicatorData([], filters());
    expect(result.periodEntries).toEqual([]);
    expect(result.volumeRanking).toEqual([]);
    expect(result.categoryGroups).toEqual([]);
    expect(result.monthlyEvolution).toEqual([]);
    expect(result.comparisons.monthOverMonth).toEqual([]);
  });

  it("should_preserve_a_recorded_zero_as_distinct_from_missing_data", () => {
    const result = buildProductionIndicatorData(
      [entry("1", { quantity: "0" })],
      filters(),
    );
    expect(result.volumeRanking[0]?.quantity).toBe(0);
    expect(result.monthlyEvolution[0]?.points.at(-1)).toMatchObject({
      quantity: 0,
      hasRecords: true,
    });
  });
});
