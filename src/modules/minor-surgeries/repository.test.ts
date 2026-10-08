import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rangePage: vi.fn(),
  singleResult: vi.fn(),
  appointmentPage: vi.fn(),
  dayIdBatch: vi.fn(),
  patientBatch: vi.fn(),
  requireMinorSurgeriesAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from: mocks.from }),
}));
vi.mock("./access", () => ({
  requireMinorSurgeriesAdmin: mocks.requireMinorSurgeriesAdmin,
}));

import {
  getSurgeryDay,
  listAllSurgeryDays,
  listDayAppointments,
  listSurgeryPatients,
  listSurgeryWaitlist,
  listUpcomingSurgeryDays,
} from "./repository";

const PAGE_SIZE = 1000;
const makeId = (value: number) =>
  `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;

describe("minor surgeries repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMinorSurgeriesAdmin.mockResolvedValue(undefined);
    mocks.from.mockImplementation((table: string) => {
      const orders: Array<{ column: string; ascending: boolean }> = [];
      let surgeryDayIds: string[] = [];
      const query = {
        select: vi.fn(() => query),
        order: vi.fn((column: string, options: { ascending: boolean }) => {
          orders.push({ column, ascending: options.ascending });
          return query;
        }),
        gte: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(() => mocks.singleResult()),
        range: vi.fn((start: number, end: number) =>
          table === "surgery_appointments"
            ? mocks.appointmentPage(surgeryDayIds, start, end, [...orders])
            : mocks.rangePage(table, start, end, [...orders]),
        ),
        in: vi.fn((column: string, ids: string[]) => {
          if (table === "patients") return mocks.patientBatch(ids);
          if (table === "surgery_appointments" && column === "surgery_day_id") {
            surgeryDayIds = ids;
            mocks.dayIdBatch(ids);
          }
          return query;
        }),
      };
      return query;
    });
  });

  it("should_throw_when_day_query_fails", async () => {
    mocks.singleResult.mockResolvedValue({
      data: null,
      error: { message: "synthetic database failure" },
    });

    await expect(getSurgeryDay(makeId(1))).rejects.toThrow(
      "Não foi possível carregar o dia de cirurgia.",
    );
  });

  it("should_return_null_when_day_does_not_exist", async () => {
    mocks.singleResult.mockResolvedValue({ data: null, error: null });

    await expect(getSurgeryDay(makeId(1))).resolves.toBeNull();
  });

  it("should_return_day_when_query_succeeds", async () => {
    const day = {
      id: makeId(1),
      procedure_date: "2026-10-30",
      capacity: 10,
    };
    mocks.singleResult.mockResolvedValue({ data: day, error: null });

    await expect(getSurgeryDay(day.id)).resolves.toEqual(day);
  });

  it("should_include_second_page_waiting_entry_when_first_page_has_1000_transferred_rows", async () => {
    const entries = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
      id: makeId(index + 1),
      patient_id: makeId(index + 10_001),
      status: index === PAGE_SIZE ? "waiting" : "transferred",
      transferred_at: index === PAGE_SIZE ? null : "2026-10-01T12:00:00Z",
      created_at: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
    }));
    const patients = new Map(
      entries.map((entry, index) => [
        entry.patient_id,
        { id: entry.patient_id, name: `Pessoa sintética ${index + 1}` },
      ]),
    );

    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data: table === "surgery_waitlist" ? entries.slice(start, end + 1) : [],
        error: null,
      }),
    );
    mocks.patientBatch.mockImplementation(async (ids: string[]) => ({
      data: ids.flatMap((id) => {
        const patient = patients.get(id);
        return patient ? [patient] : [];
      }),
      error: null,
    }));

    const result = await listSurgeryWaitlist();

    expect(mocks.rangePage).toHaveBeenCalledTimes(2);
    expect(mocks.rangePage.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mocks.rangePage.mock.calls.map((call) => call[3])).toEqual([
      [
        { column: "created_at", ascending: true },
        { column: "id", ascending: true },
      ],
      [
        { column: "created_at", ascending: true },
        { column: "id", ascending: true },
      ],
    ]);
    expect(mocks.patientBatch.mock.calls.map(([ids]) => ids.length)).toEqual([
      500, 500, 1,
    ]);
    expect(mocks.patientBatch.mock.calls.flatMap(([ids]) => ids)).toHaveLength(
      new Set(entries.map((entry) => entry.patient_id)).size,
    );
    expect(result).toHaveLength(PAGE_SIZE + 1);
    expect(result.map((entry) => entry.id)).toEqual(
      entries.map((entry) => entry.id),
    );
    expect(result[0].status).toBe("transferred");
    expect(result[PAGE_SIZE].status).toBe("waiting");
    expect(result[PAGE_SIZE].patient.name).toBe("Pessoa sintética 1001");
    expect(
      result.some((entry) => entry.patient.name === "Cadastro indisponível"),
    ).toBe(false);
  });

  it("should_list_1001_patients_when_catalog_exceeds_page_size", async () => {
    const patients = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
      id: makeId(index + 20_001),
      name: `Paciente ${String(index + 1).padStart(4, "0")}`,
    }));
    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data: table === "patients" ? patients.slice(start, end + 1) : [],
        error: null,
      }),
    );

    const result = await listSurgeryPatients();

    expect(mocks.rangePage).toHaveBeenCalledTimes(2);
    expect(mocks.rangePage.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mocks.rangePage.mock.calls.map((call) => call[3])).toEqual([
      [
        { column: "name", ascending: true },
        { column: "id", ascending: true },
      ],
      [
        { column: "name", ascending: true },
        { column: "id", ascending: true },
      ],
    ]);
    expect(result).toHaveLength(PAGE_SIZE + 1);
    expect(result.map((patient) => patient.id)).toEqual(
      patients.map((patient) => patient.id),
    );
    expect(result[PAGE_SIZE].name).toBe("Paciente 1001");
  });

  it("should_query_unique_patient_ids_when_waitlist_repeats_a_patient", async () => {
    const patientId = makeId(30_001);
    mocks.rangePage.mockResolvedValue({
      data: [
        {
          id: makeId(30_101),
          patient_id: patientId,
          status: "transferred",
          transferred_at: "2026-10-01T12:00:00Z",
          created_at: "2026-10-01T12:00:00Z",
        },
        {
          id: makeId(30_102),
          patient_id: patientId,
          status: "waiting",
          transferred_at: null,
          created_at: "2026-10-02T12:00:00Z",
        },
      ],
      error: null,
    });
    mocks.patientBatch.mockResolvedValue({
      data: [{ id: patientId, name: "Pessoa sintética repetida" }],
      error: null,
    });

    const result = await listSurgeryWaitlist();

    expect(mocks.patientBatch).toHaveBeenCalledOnce();
    expect(mocks.patientBatch).toHaveBeenCalledWith([patientId]);
    expect(result.map((entry) => entry.patient.name)).toEqual([
      "Pessoa sintética repetida",
      "Pessoa sintética repetida",
    ]);
  });

  it("should_return_all_upcoming_days_when_catalog_exceeds_page_size", async () => {
    const days = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
      id: makeId(index + 40_001),
      procedure_date: new Date(Date.UTC(2040, 0, index + 1))
        .toISOString()
        .slice(0, 10),
      capacity: 10,
    }));
    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data: table === "surgery_days" ? days.slice(start, end + 1) : [],
        error: null,
      }),
    );
    mocks.appointmentPage.mockResolvedValue({ data: [], error: null });

    const result = await listUpcomingSurgeryDays();

    expect(mocks.rangePage).toHaveBeenCalledTimes(2);
    expect(mocks.rangePage.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mocks.dayIdBatch.mock.calls.map(([ids]) => ids.length)).toEqual([
      500, 500, 1,
    ]);
    expect(mocks.appointmentPage).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(PAGE_SIZE + 1);
    expect(result[PAGE_SIZE].id).toBe(days[PAGE_SIZE].id);
    expect(result[PAGE_SIZE].occupied).toBe(0);
  });

  it("should_return_all_days_when_historical_catalog_exceeds_page_size", async () => {
    const days = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
      id: makeId(index + 50_001),
      procedure_date: new Date(Date.UTC(2040, 0, PAGE_SIZE + 1 - index))
        .toISOString()
        .slice(0, 10),
      capacity: 10,
    }));
    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data: table === "surgery_days" ? days.slice(start, end + 1) : [],
        error: null,
      }),
    );
    mocks.appointmentPage.mockResolvedValue({ data: [], error: null });

    const result = await listAllSurgeryDays();

    expect(mocks.rangePage).toHaveBeenCalledTimes(2);
    expect(mocks.rangePage.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mocks.rangePage.mock.calls.map((call) => call[3])).toEqual([
      [
        { column: "procedure_date", ascending: false },
        { column: "id", ascending: true },
      ],
      [
        { column: "procedure_date", ascending: false },
        { column: "id", ascending: true },
      ],
    ]);
    expect(result).toHaveLength(PAGE_SIZE + 1);
  });

  it("should_return_all_appointments_when_day_exceeds_page_size", async () => {
    const patientId = makeId(60_001);
    const dayId = makeId(60_002);
    const appointments = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
      id: makeId(index + 60_100),
      surgery_day_id: dayId,
      patient_id: patientId,
      source_waitlist_id: null,
      status: "confirmed",
      created_at: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
      updated_at: "2026-10-01T12:00:00Z",
    }));
    mocks.appointmentPage.mockImplementation(
      async (_dayIds: string[], start: number, end: number) => ({
        data: appointments.slice(start, end + 1),
        error: null,
      }),
    );
    mocks.patientBatch.mockResolvedValue({
      data: [{ id: patientId, name: "Pessoa sintética do agendamento" }],
      error: null,
    });

    const result = await listDayAppointments(dayId);

    expect(mocks.appointmentPage).toHaveBeenCalledTimes(2);
    expect(
      mocks.appointmentPage.mock.calls.map((call) => call.slice(1, 3)),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(result).toHaveLength(PAGE_SIZE + 1);
    expect(result[PAGE_SIZE].patient.name).toBe(
      "Pessoa sintética do agendamento",
    );
  });
});
