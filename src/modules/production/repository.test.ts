import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductionEntry,
  DuplicateProductionRecordError,
} from "./repository";

const { rpc, requireProductionAdmin } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireProductionAdmin: vi.fn(),
}));

vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ rpc }),
}));
vi.mock("server-only", () => ({}));
vi.mock("./access", () => ({ requireProductionAdmin }));

beforeEach(() => {
  vi.clearAllMocks();
  requireProductionAdmin.mockResolvedValue({ id: "admin" });
});

describe("production repository", () => {
  it("sends a normalized entry payload without client supplied actor identity", async () => {
    rpc.mockResolvedValueOnce({
      data: "f10a7281-2a42-4fd4-b7f5-d5b7d46d54bd",
      error: null,
    });

    await createProductionEntry({
      procedure_id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
      reference_period: "2026-03-01",
      quantity: "12",
      source: "manual",
    });

    expect(rpc).toHaveBeenCalledWith("create_production_entry", {
      p_procedure_id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
      p_reference_period: "2026-03-01",
      p_quantity: "12",
      p_source: "manual",
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("actor_id");
  });

  it("surfaces Data API conflicts for duplicate records", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });

    await expect(
      createProductionEntry({
        procedure_id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
        reference_period: "2026-03-01",
        quantity: "12",
        source: "manual",
      }),
    ).rejects.toBeInstanceOf(DuplicateProductionRecordError);
  });

  it("rejects an invalid RPC return contract", async () => {
    rpc.mockResolvedValueOnce({ data: { id: "unexpected" }, error: null });

    await expect(
      createProductionEntry({
        procedure_id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
        reference_period: "2026-03-01",
        quantity: "12",
        source: "manual",
      }),
    ).rejects.toThrow("Não foi possível confirmar o cadastro de Produção.");
  });
});
