import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  gt: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

import {
  createAdmissionEntry,
  createAdmissionTarget,
  createDoctor,
  getAdmissionDashboardTotals,
  importAdmissionEntries,
  listAdmissionEntries,
  listAdmissionEntriesForExport,
  listDoctors,
  listAdmissionTargets,
  setDoctorActive,
  updateAdmissionEntry,
  updateAdmissionTarget,
  updateDoctor,
} from "./repository";

const doctor = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Dr. Médico Teste A",
  active: true,
  created_at: "2026-10-07T12:00:00Z",
  updated_at: "2026-10-07T12:00:00Z",
};

describe("doctors repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-user-id" });
    mocks.from.mockReturnValue({ select: mocks.select });
    const query = { gt: mocks.gt, order: mocks.order, limit: mocks.limit };
    mocks.gt.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.order.mockReturnValue(query);
    mocks.limit.mockResolvedValue({ data: [doctor], error: null });
    mocks.rpc.mockResolvedValue({ data: doctor.id, error: null });
  });

  it("should_list_active_and_inactive_doctors_ordered_by_name", async () => {
    await expect(listDoctors()).resolves.toEqual([doctor]);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith("doctors");
    expect(mocks.select).toHaveBeenCalledWith(
      "id,name,active,created_at,updated_at",
    );
    expect(mocks.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(mocks.limit).toHaveBeenCalledWith(1000);
  });

  it("should_report_data_api_errors_when_listing_doctors", async () => {
    mocks.limit.mockResolvedValue({ data: null, error: { code: "500" } });
    await expect(listDoctors()).rejects.toThrow(
      "Não foi possível carregar a lista de médicos.",
    );
  });

  it("should_cursor_paginate_doctors_beyond_the_data_api_limit", async () => {
    const makeDoctor = (index: number) => ({
      ...doctor,
      id: `20000000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`,
    });
    const lastDoctor = {
      ...doctor,
      id: "20000000-0000-4000-8000-999999999999",
    };
    mocks.limit
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, index) => makeDoctor(index)),
        error: null,
      })
      .mockResolvedValueOnce({ data: [lastDoctor], error: null });

    const doctors = await listDoctors();

    expect(doctors).toHaveLength(1001);
    expect(mocks.gt).toHaveBeenCalledWith(
      "id",
      "20000000-0000-4000-8000-000000001001",
    );
  });

  it("should_not_query_doctors_when_admin_authorization_fails", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));
    await expect(listDoctors()).rejects.toThrow("Unauthorized");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("should_create_doctor_through_authorized_rpc_without_client_actor", async () => {
    await createDoctor("Dr. Médico Teste A");
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("create_doctor", {
      p_name: "Dr. Médico Teste A",
    });
  });

  it("should_update_doctor_name_through_authorized_rpc", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await updateDoctor(doctor.id, "Dra. Médica Teste B");
    expect(mocks.rpc).toHaveBeenCalledWith("update_doctor", {
      p_id: doctor.id,
      p_name: "Dra. Médica Teste B",
    });
  });

  it("should_change_active_state_through_authorized_rpc", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await setDoctorActive(doctor.id, false);
    expect(mocks.rpc).toHaveBeenCalledWith("set_doctor_active", {
      p_id: doctor.id,
      p_active: false,
    });
  });

  it("should_reject_database_mutation_errors", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(createDoctor("Dr. Médico Teste A")).rejects.toThrow(
      "Não foi possível cadastrar o médico.",
    );
  });

  it("should_create_daily_entry_through_session_actor_rpc", async () => {
    await createAdmissionEntry({
      doctorId: doctor.id,
      entryDate: "2026-10-07",
      quantity: 3,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("create_admission_entry", {
      p_doctor_id: doctor.id,
      p_entry_date: "2026-10-07",
      p_quantity: 3,
    });
    expect(mocks.rpc.mock.calls[0]?.[1]).not.toHaveProperty("actor_id");
  });

  it("should_update_entry_quantity_without_sending_actor", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await updateAdmissionEntry({
      id: "20000000-0000-4000-8000-000000000002",
      quantity: 6,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("update_admission_entry", {
      p_id: "20000000-0000-4000-8000-000000000002",
      p_quantity: 6,
    });
  });

  it("should_create_month_target_using_hospital_period_rpc", async () => {
    await createAdmissionTarget({
      periodType: "month",
      referencePeriod: "2026-10-01",
      quantity: 28,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("create_admission_target", {
      p_period_type: "month",
      p_reference_period: "2026-10-01",
      p_target_quantity: 28,
    });
  });

  it("should_update_target_quantity_without_changing_period", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await updateAdmissionTarget({
      id: "20000000-0000-4000-8000-000000000003",
      quantity: 80,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("update_admission_target", {
      p_id: "20000000-0000-4000-8000-000000000003",
      p_target_quantity: 80,
    });
  });

  it("should_import_validated_rows_in_one_database_rpc_without_actor_input", async () => {
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    await expect(
      importAdmissionEntries([
        { entry_date: "2026-10-06", doctor_name: "Dr. Teste A", quantity: 2 },
        { entry_date: "2026-10-07", doctor_name: "Dra. Teste B", quantity: 4 },
      ]),
    ).resolves.toBe(2);
    expect(mocks.rpc).toHaveBeenCalledWith("import_admission_entries", {
      p_rows: [
        { entry_date: "2026-10-06", doctor_name: "Dr. Teste A", quantity: 2 },
        { entry_date: "2026-10-07", doctor_name: "Dra. Teste B", quantity: 4 },
      ],
    });
  });

  it("should_export_a_single_snapshot_when_admissions_are_inserted_concurrently", async () => {
    const snapshot = [
      {
        entry_date: "2026-10-07",
        quantity: 3,
        doctor_name: doctor.name,
      },
      {
        entry_date: "2026-10-06",
        quantity: 2,
        doctor_name: doctor.name,
      },
    ];
    const currentRows = [...snapshot];
    mocks.rpc.mockImplementation(async () => {
      const rowsInStatementSnapshot = [...currentRows];
      currentRows.unshift({
        entry_date: "2026-10-08",
        quantity: 5,
        doctor_name: doctor.name,
      });
      return { data: rowsInStatementSnapshot, error: null };
    });

    const entries = await listAdmissionEntriesForExport(
      "2026-10-01",
      "2026-11-01",
      10_001,
    );

    expect(entries).toEqual([
      { entry_date: "2026-10-07", doctor_name: doctor.name, quantity: 3 },
      { entry_date: "2026-10-06", doctor_name: doctor.name, quantity: 2 },
    ]);
    expect(currentRows).toHaveLength(3);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "list_admission_entries_for_export",
      {
        p_start_date: "2026-10-01",
        p_end_date: "2026-11-01",
        p_limit: 10_001,
      },
    );
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  });

  it("should_read_all_admission_entries_in_one_database_snapshot", async () => {
    const mockEntries = [
      {
        id: "20000000-0000-4000-8000-000000000002",
        doctor_id: doctor.id,
        entry_date: "2026-10-07",
        quantity: 1,
        created_at: "2026-10-07T12:00:00Z",
        updated_at: "2026-10-07T12:00:00Z",
      },
      {
        id: "20000000-0000-4000-8000-000000000001",
        doctor_id: doctor.id,
        entry_date: "2026-10-06",
        quantity: 3,
        created_at: "2026-10-06T12:00:00Z",
        updated_at: "2026-10-06T12:00:00Z",
      },
    ];
    mocks.rpc.mockResolvedValue({ data: mockEntries, error: null });

    const entries = await listAdmissionEntries("2026-01-01", "2027-01-01");
    expect(entries.map((entry) => entry.id)).toEqual([
      "20000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000001",
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_admission_entries", {
      p_start_date: "2026-01-01",
      p_end_date: "2027-01-01",
      p_doctor_id: null,
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("doctors");
  });

  it("should_cursor_paginate_all_admission_targets", async () => {
    const makeTarget = (index: number) => ({
      id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      period_type: "month",
      reference_period: "2026-10-01",
      target_quantity: 1,
      created_at: "2026-10-07T12:00:00Z",
      updated_at: "2026-10-07T12:00:00Z",
    });
    const limit = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, index) => makeTarget(index)),
        error: null,
      })
      .mockResolvedValueOnce({ data: [makeTarget(1000)], error: null });
    const query = {
      gte: vi.fn(),
      lt: vi.fn(),
      gt: vi.fn(),
      order: vi.fn(),
      limit,
    };
    query.gte.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    query.gt.mockReturnValue(query);
    query.order.mockReturnValue(query);
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue(query) });

    const targets = await listAdmissionTargets("1900-01-01", "2101-01-01");

    expect(targets).toHaveLength(1001);
    expect(query.gt).toHaveBeenCalledWith(
      "id",
      "30000000-0000-4000-8000-000000001000",
    );
    expect(limit).toHaveBeenCalledTimes(2);
  });
});

describe("admissions dashboard repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-user-id" });
  });

  it("should_load_month_and_doctor_totals_without_listing_entries_or_doctors", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        monthly_totals: [{ month: 1, quantity: 5 }],
        annual_total: 5,
        by_doctor: [
          {
            doctor_id: doctor.id,
            doctor_name: doctor.name,
            doctor_active: false,
            quantity: 5,
          },
        ],
      },
      error: null,
    });

    await expect(
      getAdmissionDashboardTotals("2026-01-01", "2027-01-01"),
    ).resolves.toEqual({
      monthlyTotals: [{ month: 1, quantity: 5 }],
      annualTotal: 5,
      byDoctor: [
        {
          doctorId: doctor.id,
          doctorName: doctor.name,
          active: false,
          quantity: 5,
        },
      ],
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_admission_dashboard_totals", {
      p_start: "2026-01-01",
      p_through_exclusive: "2027-01-01",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
