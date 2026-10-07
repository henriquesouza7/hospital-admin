import { describe, expect, it } from "vitest";
import {
  summarizeAdmissions,
  type AdmissionEntry,
  type AdmissionTarget,
} from "./domain";

const entries: AdmissionEntry[] = [
  {
    id: "1",
    doctor_id: "doctor-a",
    doctor_name: "Dra. Teste A",
    doctor_active: true,
    entry_date: "2026-10-02",
    quantity: 3,
    created_at: "2026-10-02T12:00:00Z",
    updated_at: "2026-10-02T12:00:00Z",
  },
  {
    id: "2",
    doctor_id: "doctor-a",
    doctor_name: "Dra. Teste A",
    doctor_active: true,
    entry_date: "2026-09-02",
    quantity: 2,
    created_at: "2026-09-02T12:00:00Z",
    updated_at: "2026-09-02T12:00:00Z",
  },
  {
    id: "3",
    doctor_id: "doctor-b",
    doctor_name: "Dr. Teste B",
    doctor_active: false,
    entry_date: "2026-01-15",
    quantity: 5,
    created_at: "2026-01-15T12:00:00Z",
    updated_at: "2026-01-15T12:00:00Z",
  },
];
const targets: AdmissionTarget[] = [
  {
    id: "target-m",
    period_type: "month",
    reference_period: "2026-10-01",
    target_quantity: 10,
    created_at: "2026-01-01T12:00:00Z",
    updated_at: "2026-01-01T12:00:00Z",
  },
  {
    id: "target-y",
    period_type: "year",
    reference_period: "2026-01-01",
    target_quantity: 100,
    created_at: "2026-01-01T12:00:00Z",
    updated_at: "2026-01-01T12:00:00Z",
  },
];

describe("admissions dashboard analytics", () => {
  it("should_calculate_month_and_year_totals_and_targets_from_daily_entries", () => {
    const summary = summarizeAdmissions(
      entries,
      targets,
      2026,
      10,
      new Date("2026-10-07T00:00:00Z"),
    );
    expect(summary.monthlyTotal).toBe(3);
    expect(summary.annualTotal).toBe(10);
    expect(summary.monthTarget).toBe(10);
    expect(summary.yearTarget).toBe(100);
  });

  it("should_group_annual_totals_by_doctor_and_keep_inactive_history", () => {
    const summary = summarizeAdmissions(
      entries,
      targets,
      2026,
      10,
      new Date("2026-10-07T00:00:00Z"),
    );
    expect(summary.byDoctor).toEqual([
      {
        doctorId: "doctor-b",
        doctorName: "Dr. Teste B",
        active: false,
        quantity: 5,
      },
      {
        doctorId: "doctor-a",
        doctorName: "Dra. Teste A",
        active: true,
        quantity: 5,
      },
    ]);
  });

  it("should_return_zeroes_for_months_without_entries_and_mark_elapsed_period", () => {
    const summary = summarizeAdmissions(
      entries,
      [],
      2026,
      10,
      new Date("2026-10-07T00:00:00Z"),
    );
    expect(summary.monthlyEvolution[0]).toMatchObject({
      month: 1,
      quantity: 5,
      isClosed: true,
    });
    expect(summary.monthlyEvolution[1]).toMatchObject({
      month: 2,
      quantity: 0,
      isClosed: true,
    });
    expect(summary.monthlyEvolution[9]).toMatchObject({
      month: 10,
      quantity: 3,
      isCurrentMonth: true,
      isClosed: false,
    });
    expect(summary.elapsedDays).toBe(7);
    expect(summary.daysInMonth).toBe(31);
  });

  it("should_mark_past_month_closed_and_future_month_not_elapsed", () => {
    const summary = summarizeAdmissions(
      entries,
      [],
      2026,
      11,
      new Date("2026-10-07T00:00:00Z"),
    );
    expect(summary.elapsedDays).toBe(0);
    expect(summary.monthlyEvolution[9]?.isClosed).toBe(false);
    expect(summary.monthlyEvolution[10]?.isClosed).toBe(false);
  });

  it("should_handle_leap_year_length", () => {
    const summary = summarizeAdmissions(
      [],
      [],
      2024,
      2,
      new Date("2024-02-10T00:00:00Z"),
    );
    expect(summary.daysInMonth).toBe(29);
    expect(summary.daysInYear).toBe(366);
  });
});
