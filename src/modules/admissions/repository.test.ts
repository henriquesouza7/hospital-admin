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
  createDoctor,
  listDoctors,
  setDoctorActive,
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
});
