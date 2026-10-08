import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  getProductionForMonth,
  summarizeSurgeryDays,
} from "./domain";

describe("administrative overview aggregations", () => {
  it("should_keep_production_sources_separate_when_competence_matches", () => {
    const result = getProductionForMonth(
      [
        {
          procedure_id: "a",
          procedure_name: "Hemograma",
          counting_unit: "exame",
          source: "realizado",
          reference_period: "2026-10-01",
          quantity: "4",
        },
        {
          procedure_id: "a",
          procedure_name: "Hemograma",
          counting_unit: "exame",
          source: "realizado",
          reference_period: "2026-10-01",
          quantity: "6",
        },
        {
          procedure_id: "b",
          procedure_name: "Consulta",
          counting_unit: "atendimento",
          source: "manual",
          reference_period: "2026-10-01",
          quantity: "3",
        },
        {
          procedure_id: "a",
          procedure_name: "Hemograma",
          counting_unit: "exame",
          source: "aprovado",
          reference_period: "2026-10-01",
          quantity: "2",
        },
        {
          procedure_id: "a",
          procedure_name: "Hemograma",
          counting_unit: "exame",
          source: "realizado",
          reference_period: "2026-09-01",
          quantity: "100",
        },
      ],
      2026,
      10,
    );
    expect(result).toEqual([
      {
        id: '["b","atendimento","manual"]',
        name: "Consulta",
        unit: "atendimento",
        source: "manual",
        quantity: 3,
      },
      {
        id: '["a","exame","aprovado"]',
        name: "Hemograma",
        unit: "exame",
        source: "aprovado",
        quantity: 2,
      },
      {
        id: '["a","exame","realizado"]',
        name: "Hemograma",
        unit: "exame",
        source: "realizado",
        quantity: 10,
      },
    ]);
  });

  it("should_sum_future_surgery_capacity_without_patient_details", () => {
    expect(
      summarizeSurgeryDays([
        {
          id: "1",
          procedure_date: "2026-10-10",
          capacity: 10,
          occupied: 4,
          awaitingConfirmation: 2,
          confirmed: 2,
        },
        {
          id: "2",
          procedure_date: "2026-10-12",
          capacity: 8,
          occupied: 3,
          awaitingConfirmation: 1,
          confirmed: 2,
        },
      ]),
    ).toEqual({ occupied: 7, capacity: 18, awaiting: 3, confirmed: 4 });
  });

  it("should_format_zero_currency_when_no_expenses_exist", () => {
    expect(formatCurrency(BigInt(0))).toBe("R$ 0,00");
  });
});
