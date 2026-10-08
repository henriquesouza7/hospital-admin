import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
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
  importAdmissionEntries,
  listAdmissionEntries,
  listDoctors,
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
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.order.mockResolvedValue({ data: [doctor], error: null });
    mocks.rpc.mockResolvedValue({ data: doctor.id, error: null });
  });

  it("should_list_active_and_inactive_doctors_ordered_by_name", async () => {
    await expect(listDoctors()).resolves.toEqual([doctor]);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith("doctors");
    expect(mocks.select).toHaveBeenCalledWith(
      "id,name,active,created_at,updated_at",
    );
    expect(mocks.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("should_report_data_api_errors_when_listing_doctors", async () => {
    mocks.order.mockResolvedValue({ data: null, error: { code: "500" } });
    await expect(listDoctors()).rejects.toThrow(
      "Não foi possível carregar a lista de médicos.",
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

  it("should_paginate_all_daily_entries_before_dashboard_aggregation", async () => {
    const makeEntry = (index: number) => ({
      id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      doctor_id: doctor.id,
      entry_date: "2026-10-07",
      quantity: 1,
      created_at: "2026-10-07T12:00:00Z",
      updated_at: "2026-10-07T12:00:00Z",
    });
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, index) => makeEntry(index)),
        error: null,
      })
      .mockResolvedValueOnce({ data: [makeEntry(1000)], error: null });
    const idOrder = vi.fn().mockReturnValue({ range });
    const dateOrder = vi.fn().mockReturnValue({ order: idOrder });
    const doctorOrder = vi.fn().mockResolvedValue({
      data: [{ id: doctor.id, name: doctor.name, active: true }],
      error: null,
    });
    mocks.from.mockImplementation((table: string) =>
      table === "doctors"
        ? { select: vi.fn().mockReturnValue({ order: doctorOrder }) }
        : {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: dateOrder,
                }),
              }),
            }),
          },
    );

    const entries = await listAdmissionEntries("2026-01-01", "2027-01-01");
    expect(entries).toHaveLength(1001);
    expect(dateOrder).toHaveBeenCalledWith("entry_date", { ascending: false });
    expect(idOrder).toHaveBeenCalledWith("id", { ascending: true });
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
