import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rangePage: vi.fn(),
  singleResult: vi.fn(),
  appointmentPage: vi.fn(),
  dayIdBatch: vi.fn(),
  patientBatch: vi.fn(),
  rpc: vi.fn(),
  requireMinorSurgeriesAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("./access", () => ({
  requireMinorSurgeriesAdmin: mocks.requireMinorSurgeriesAdmin,
}));

import {
  getSurgeryDay,
  listDayAppointments,
  listSurgeryDaysPage,
  listMinorSurgeryAudit,
  listSurgeryWaitlist,
  listUpcomingSurgeryDays,
  searchSurgeryPatients,
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
      const filters: Array<[string, unknown]> = [];
      let surgeryDayIds: string[] = [];
      const query = {
        select: vi.fn(() => query),
        order: vi.fn((column: string, options: { ascending: boolean }) => {
          orders.push({ column, ascending: options.ascending });
          return query;
        }),
        gte: vi.fn(() => query),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        }),
        ilike: vi.fn((column: string, value: string) => {
          filters.push([column, value]);
          return query;
        }),
        maybeSingle: vi.fn(() => mocks.singleResult()),
        range: vi.fn((start: number, end: number) =>
          table === "surgery_appointments"
            ? mocks.appointmentPage(surgeryDayIds, start, end, [...orders])
            : mocks.rangePage(table, start, end, [...orders], [...filters]),
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

  it("should_fetch_waiting_entries_completely_and_bound_transferred_history", async () => {
    const waitingEntry = {
      id: makeId(1),
      patient_id: makeId(10_001),
      status: "waiting",
      transferred_at: null,
      created_at: "2026-10-01T12:00:00Z",
    };
    const transferredEntries = Array.from({ length: 51 }, (_, index) => ({
      id: makeId(index + 2),
      patient_id: makeId(index + 10_002),
      status: "transferred",
      transferred_at: new Date(Date.UTC(2026, 9, 51 - index, 12)).toISOString(),
      created_at: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
    }));
    const entries = [waitingEntry, ...transferredEntries];
    const patients = new Map(
      entries.map((entry, index) => [
        entry.patient_id,
        { id: entry.patient_id, name: `Pessoa sintética ${index + 1}` },
      ]),
    );

    mocks.rangePage.mockImplementation(
      async (
        table: string,
        start: number,
        end: number,
        _orders: unknown,
        filters: Array<[string, unknown]>,
      ) => ({
        data:
          table !== "surgery_waitlist"
            ? []
            : filters.some(([, value]) => value === "waiting")
              ? [waitingEntry].slice(start, end + 1)
              : transferredEntries.slice(start, end + 1),
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
      [0, 50],
    ]);
    expect(mocks.rangePage.mock.calls.map((call) => call[4])).toEqual([
      [["status", "waiting"]],
      [["status", "transferred"]],
    ]);
    expect(mocks.patientBatch.mock.calls.map(([ids]) => ids.length)).toEqual([
      51,
    ]);
    expect(mocks.patientBatch.mock.calls.flatMap(([ids]) => ids)).toHaveLength(
      new Set(
        [waitingEntry, ...transferredEntries.slice(0, 50)].map(
          (entry) => entry.patient_id,
        ),
      ).size,
    );
    expect(mocks.rangePage.mock.calls[1][3]).toEqual([
      { column: "transferred_at", ascending: false },
      { column: "id", ascending: false },
    ]);
    expect(result.waiting).toHaveLength(1);
    expect(result.waiting[0].id).toBe(waitingEntry.id);
    expect(result.transferred).toHaveLength(50);
    expect(result.hasMoreTransferred).toBe(true);
    expect(result.transferPage).toBe(1);
    expect(result.transferred.map((entry) => entry.id)).toEqual(
      transferredEntries.slice(0, 50).map((entry) => entry.id),
    );
    expect(result.waiting[0].patient.name).toBe("Pessoa sintética 1");
    expect(
      [...result.waiting, ...result.transferred].some(
        (entry) => entry.patient.name === "Cadastro indisponível",
      ),
    ).toBe(false);
  });

  it("should_load_requested_transferred_history_page_with_a_bounded_range", async () => {
    const transferredEntries = Array.from({ length: 121 }, (_, index) => ({
      id: makeId(index + 1),
      patient_id: makeId(index + 1_001),
      status: "transferred",
      transferred_at: new Date(
        Date.UTC(2026, 9, 121 - index, 12),
      ).toISOString(),
      created_at: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
    }));
    mocks.rangePage.mockImplementation(
      async (
        table: string,
        start: number,
        end: number,
        _orders: unknown,
        filters: Array<[string, unknown]>,
      ) => ({
        data:
          table === "surgery_waitlist" &&
          filters.some(([, value]) => value === "transferred")
            ? transferredEntries.slice(start, end + 1)
            : [],
        error: null,
      }),
    );
    mocks.patientBatch.mockResolvedValue({ data: [], error: null });

    const result = await listSurgeryWaitlist(2);

    expect(mocks.rangePage).toHaveBeenCalledTimes(2);
    expect(mocks.rangePage.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 999],
      [50, 100],
    ]);
    expect(result.transferred.map((entry) => entry.id)).toEqual(
      transferredEntries.slice(50, 100).map((entry) => entry.id),
    );
    expect(result.hasMoreTransferred).toBe(true);
    expect(result.transferPage).toBe(2);
  });

  it("should_search_patients_in_bounded_pages_and_escape_like_wildcards", async () => {
    const patients = Array.from({ length: 51 }, (_, index) => ({
      id: makeId(index + 20_001),
      name: `Paciente ${String(index + 1).padStart(2, "0")}`,
    }));
    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data: table === "patients" ? patients.slice(start, end + 1) : [],
        error: null,
      }),
    );

    const result = await searchSurgeryPatients(" Ana%_\\ ", 0);

    expect(mocks.rangePage).toHaveBeenCalledOnce();
    expect(mocks.rangePage.mock.calls[0].slice(1, 3)).toEqual([0, 50]);
    expect(mocks.rangePage.mock.calls[0][3]).toEqual([
      { column: "name", ascending: true },
      { column: "id", ascending: true },
    ]);
    expect(mocks.rangePage.mock.calls[0][4]).toEqual([
      ["name", "%Ana\\%\\_\\\\%"],
    ]);
    expect(result.patients).toHaveLength(50);
    expect(result.hasMore).toBe(true);
    expect(result.offset).toBe(0);
  });

  it("should_fetch_next_patient_search_page_from_its_offset", async () => {
    mocks.rangePage.mockImplementation(
      async (table: string, start: number, end: number) => ({
        data:
          table === "patients"
            ? Array.from({ length: 11 }, (_, index) => ({
                id: makeId(start + index + 21_000),
                name: `Pessoa ${start + index + 1}`,
              })).slice(0, end - start + 1)
            : [],
        error: null,
      }),
    );

    const result = await searchSurgeryPatients("", 50);

    expect(mocks.rangePage.mock.calls[0].slice(1, 3)).toEqual([50, 100]);
    expect(mocks.rangePage.mock.calls[0][4]).toEqual([]);
    expect(result.patients).toHaveLength(11);
    expect(result.hasMore).toBe(false);
  });

  it("should_reject_patient_search_terms_shorter_than_three_characters", async () => {
    await expect(searchSurgeryPatients(" An ", 0)).rejects.toThrow(
      "Digite ao menos 3 caracteres para buscar cadastros.",
    );

    expect(mocks.requireMinorSurgeriesAdmin).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("should_query_unique_patient_ids_when_waitlist_repeats_a_patient", async () => {
    const patientId = makeId(30_001);
    mocks.rangePage.mockImplementation(
      async (
        table: string,
        _start: number,
        _end: number,
        _orders: unknown,
        filters: Array<[string, unknown]>,
      ) => ({
        data:
          table !== "surgery_waitlist"
            ? []
            : filters.some(([, value]) => value === "waiting")
              ? [
                  {
                    id: makeId(30_102),
                    patient_id: patientId,
                    status: "waiting",
                    transferred_at: null,
                    created_at: "2026-10-02T12:00:00Z",
                  },
                ]
              : [
                  {
                    id: makeId(30_101),
                    patient_id: patientId,
                    status: "transferred",
                    transferred_at: "2026-10-01T12:00:00Z",
                    created_at: "2026-10-01T12:00:00Z",
                  },
                ],
        error: null,
      }),
    );
    mocks.patientBatch.mockResolvedValue({
      data: [{ id: patientId, name: "Pessoa sintética repetida" }],
      error: null,
    });

    const result = await listSurgeryWaitlist();

    expect(mocks.patientBatch).toHaveBeenCalledOnce();
    expect(mocks.patientBatch).toHaveBeenCalledWith([patientId]);
    expect(
      [...result.transferred, ...result.waiting].map(
        (entry) => entry.patient.name,
      ),
    ).toEqual(["Pessoa sintética repetida", "Pessoa sintética repetida"]);
  });

  it("should_load_minor_surgery_audit_through_the_admin_rpc", async () => {
    const audit = {
      id: 1,
      actor_id: makeId(31_002),
      actor_name: "Administradora sintética",
      subject: "Pessoa sintética · 12/10/2026",
      entity_type: "surgery_patient",
      entity_id: makeId(31_001),
      action: "updated",
      payload: { name: { old: "Nome anterior", new: "Nome atualizado" } },
      created_at: "2026-10-01T12:00:00Z",
    };
    mocks.rpc.mockResolvedValue({ data: [audit], error: null });

    await expect(listMinorSurgeryAudit()).resolves.toEqual({
      events: [audit],
      page: 1,
      hasMore: false,
    });

    expect(mocks.requireMinorSurgeriesAdmin).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("list_minor_surgery_audit", {
      p_offset: 0,
    });
  });

  it("should_paginate_minor_surgery_audit_with_one_row_to_detect_more", async () => {
    const events = Array.from({ length: 51 }, (_, index) => ({
      id: index + 1,
      actor_id: makeId(index + 32_100),
      actor_name: `Administradora sintética ${index + 1}`,
      subject: `Pessoa sintética ${index + 1}`,
      entity_type: "surgery_appointment",
      entity_id: makeId(index + 32_000),
      action: "created",
      payload: { status: "confirmed" },
      created_at: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    }));
    mocks.rpc.mockResolvedValue({ data: events, error: null });

    const result = await listMinorSurgeryAudit(2);

    expect(result.events).toHaveLength(50);
    expect(result.events[0].id).toBe(1);
    expect(result.page).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("list_minor_surgery_audit", {
      p_offset: 50,
    });
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

  it("should_load_a_bounded_historical_day_page_and_only_its_appointments", async () => {
    const days = Array.from({ length: 51 }, (_, index) => ({
      id: makeId(index + 50_001),
      procedure_date: new Date(Date.UTC(2040, 0, 51 - index))
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

    const result = await listSurgeryDaysPage();

    expect(mocks.rangePage).toHaveBeenCalledOnce();
    expect(mocks.rangePage.mock.calls[0].slice(1, 3)).toEqual([0, 50]);
    expect(mocks.rangePage.mock.calls[0][3]).toEqual([
      { column: "procedure_date", ascending: false },
      { column: "id", ascending: true },
    ]);
    expect(mocks.dayIdBatch).toHaveBeenCalledOnce();
    expect(mocks.dayIdBatch.mock.calls[0][0]).toEqual(
      days.slice(0, 50).map((day) => day.id),
    );
    expect(result.days).toHaveLength(50);
    expect(result.days[0].id).toBe(days[0].id);
    expect(result.page).toBe(1);
    expect(result.hasMore).toBe(true);
  });

  it("should_load_the_requested_historical_day_page", async () => {
    const days = Array.from({ length: 101 }, (_, index) => ({
      id: makeId(index + 51_001),
      procedure_date: new Date(Date.UTC(2040, 0, 101 - index))
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

    const result = await listSurgeryDaysPage(2);

    expect(mocks.rangePage.mock.calls[0].slice(1, 3)).toEqual([50, 100]);
    expect(mocks.dayIdBatch).toHaveBeenCalledOnce();
    expect(mocks.dayIdBatch.mock.calls[0][0]).toEqual(
      days.slice(50, 100).map((day) => day.id),
    );
    expect(result.days).toHaveLength(50);
    expect(result.days[0].id).toBe(days[50].id);
    expect(result.page).toBe(2);
    expect(result.hasMore).toBe(true);
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
