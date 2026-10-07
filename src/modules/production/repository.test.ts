import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductionEntry,
  DuplicateProductionRecordError,
  listProductionEntries,
} from "./repository";

const { from, rpc, requireProductionAdmin } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  requireProductionAdmin: vi.fn(),
}));

vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from, rpc }),
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

  it("should_preserve_entry_unit_when_procedure_unit_changes", async () => {
    const rowsByTable: Record<string, unknown[]> = {
      production_entries: [
        {
          id: "f10a7281-2a42-4fd4-b7f5-d5b7d46d54bd",
          procedure_id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
          counting_unit: "unidade historica",
          reference_period: "2026-03-01",
          quantity: "12",
          source: "manual",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      procedures: [
        {
          id: "d6bcb317-a52e-4b88-a97b-ad993e8f4010",
          category_id: "fe90a7f4-45c9-4a52-9b4f-fb7ce6f50a9f",
          name: "Procedimento",
          counting_unit: "unidade atual",
          active: true,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      procedure_categories: [
        {
          id: "fe90a7f4-45c9-4a52-9b4f-fb7ce6f50a9f",
          name: "Categoria",
          active: true,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
    };
    from.mockImplementation((table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        lte: () => query,
        order: () => query,
        range: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: rowsByTable[table], error: null }).then(
            resolve,
          ),
      };
      return query;
    });

    const entries = await listProductionEntries();

    expect(entries[0]?.counting_unit).toBe("unidade historica");
  });

  it("should_paginate_entries_with_filters_and_deterministic_order", async () => {
    const procedureId = "d6bcb317-a52e-4b88-a97b-ad993e8f4010";
    const categoryId = "fe90a7f4-45c9-4a52-9b4f-fb7ce6f50a9f";
    const timestamp = "2026-03-01T00:00:00.000Z";
    const makeEntry = (index: number) => ({
      id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
      procedure_id: procedureId,
      counting_unit: "unidade",
      reference_period: "2026-03-01",
      quantity: "1",
      source: "manual",
      created_at: timestamp,
      updated_at: timestamp,
    });
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      makeEntry(index + 1),
    );
    const secondPage = [makeEntry(1001)];
    const rowsByTable: Record<string, unknown[]> = {
      procedures: [
        {
          id: procedureId,
          category_id: categoryId,
          name: "Procedimento",
          counting_unit: "unidade",
          active: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      procedure_categories: [
        {
          id: categoryId,
          name: "Categoria",
          active: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
    };
    const calls: Array<{
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending: boolean }]>;
      range?: [number, number];
    }> = [];
    from.mockImplementation((table: string) => {
      const call = {
        filters: [],
        orders: [],
        range: undefined,
      } as (typeof calls)[number];
      calls.push(call);
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return query;
        },
        gte: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return query;
        },
        lte: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return query;
        },
        order: (column: string, options: { ascending: boolean }) => {
          call.orders.push([column, options]);
          return query;
        },
        range: (start: number, end: number) => {
          call.range = [start, end];
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data:
              table !== "production_entries"
                ? rowsByTable[table]
                : call.range?.[0] === 0
                  ? firstPage
                  : secondPage,
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const entries = await listProductionEntries({
      procedure_id: procedureId,
      from: "2026-01",
      to: "2026-03",
    });

    const entryCalls = calls.filter(({ range }) => range !== undefined);
    expect(entryCalls.map(({ range }) => range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(entryCalls.map(({ filters }) => filters)).toEqual([
      [
        ["procedure_id", procedureId],
        ["reference_period", "2026-01-01"],
        ["reference_period", "2026-03-01"],
      ],
      [
        ["procedure_id", procedureId],
        ["reference_period", "2026-01-01"],
        ["reference_period", "2026-03-01"],
      ],
    ]);
    expect(entryCalls.map(({ orders }) => orders)).toEqual([
      [
        ["reference_period", { ascending: false }],
        ["id", { ascending: true }],
      ],
      [
        ["reference_period", { ascending: false }],
        ["id", { ascending: true }],
      ],
    ]);
    expect(entries).toHaveLength(1001);
    expect(entries.at(-1)?.id).toBe(makeEntry(1001).id);
    expect(entries.map(({ id }) => id)).toEqual(
      [...firstPage, ...secondPage].map(({ id }) => id),
    );
  });
});
