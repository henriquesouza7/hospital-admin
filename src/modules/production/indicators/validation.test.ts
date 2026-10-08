import { describe, expect, it } from "vitest";
import { parseProductionIndicatorFilters } from "./validation";

const fixedDate = new Date("2026-06-15T12:00:00.000Z");

describe("production indicator filters", () => {
  it("should_default_to_the_current_competence_when_parameters_are_absent", () => {
    expect(
      parseProductionIndicatorFilters({}, fixedDate).filters,
    ).toMatchObject({
      mode: "competencia",
      competence: "2026-06",
      year: "2026",
    });
  });

  it("should_accept_a_month_range_in_chronological_order", () => {
    const result = parseProductionIndicatorFilters(
      { visao: "intervalo", de: "2025-11", ate: "2026-02" },
      fixedDate,
    );
    expect(result.error).toBeUndefined();
    expect(result.filters).toMatchObject({
      mode: "intervalo",
      from: "2025-11",
      to: "2026-02",
    });
  });

  it("should_reject_an_interval_ending_before_it_starts", () => {
    const result = parseProductionIndicatorFilters(
      { visao: "intervalo", de: "2026-02", ate: "2026-01" },
      fixedDate,
    );
    expect(result.error).toContain("posterior");
    expect(result.filters.mode).toBe("competencia");
  });

  it("should_reject_repeated_or_malformed_filter_values", () => {
    const result = parseProductionIndicatorFilters(
      { visao: ["ano", "intervalo"], ano: "26" },
      fixedDate,
    );
    expect(result.error).toBeDefined();
    expect(result.filters).toMatchObject({ mode: "competencia", year: "2026" });
  });
});
