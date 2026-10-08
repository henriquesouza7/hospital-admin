import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductionEntry,
  DuplicateProductionRecordError,
  listProductionEntries,
  listProductionProcedures,
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
      table: string;
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending: boolean }]>;
      range?: [number, number];
    }> = [];
    from.mockImplementation((table: string) => {
      const call = {
        table,
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

    const entryCalls = calls.filter(
      ({ table }) => table === "production_entries",
    );
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

  it.each(["ativos", "inativos"] as const)(
    "should_paginate_procedures_and_reapply_filters_for_%s",
    async (status) => {
      const categoryId = "fe90a7f4-45c9-4a52-9b4f-fb7ce6f50a9f";
      const timestamp = "2026-03-01T00:00:00.000Z";
      const active = status === "ativos";
      const makeProcedure = (index: number) => ({
        id: `00000000-0000-4000-8001-${index.toString().padStart(12, "0")}`,
        category_id: categoryId,
        name: `Procedimento ${index.toString().padStart(4, "0")}`,
        counting_unit: "unidade",
        active,
        created_at: timestamp,
        updated_at: timestamp,
      });
      const firstPage = Array.from({ length: 1000 }, (_, index) =>
        makeProcedure(index + 1),
      );
      const secondPage = [makeProcedure(1001)];
      const calls: Array<{
        table: string;
        filters: Array<[string, unknown]>;
        orders: Array<[string, { ascending: boolean }]>;
        range?: [number, number];
      }> = [];
      from.mockImplementation((table: string) => {
        const call = {
          table,
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
          gte: () => query,
          lte: () => query,
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
                table === "procedures"
                  ? call.range?.[0] === 0
                    ? firstPage
                    : secondPage
                  : [
                      {
                        id: categoryId,
                        name: "Categoria teste",
                        active: true,
                        created_at: timestamp,
                        updated_at: timestamp,
                      },
                    ],
              error: null,
            }).then(resolve),
        };
        return query;
      });

      const procedures = await listProductionProcedures({
        category_id: categoryId,
        status,
      });

      const pages = calls.filter(({ table }) => table === "procedures");
      expect(pages.map(({ range }) => range)).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
      expect(pages.map(({ filters }) => filters)).toEqual([
        [
          ["category_id", categoryId],
          ["active", active],
        ],
        [
          ["category_id", categoryId],
          ["active", active],
        ],
      ]);
      expect(pages.map(({ orders }) => orders)).toEqual([
        [
          ["name", { ascending: true }],
          ["id", { ascending: true }],
        ],
        [
          ["name", { ascending: true }],
          ["id", { ascending: true }],
        ],
      ]);
      expect(procedures).toHaveLength(1001);
      expect(procedures.at(-1)?.id).toBe(makeProcedure(1001).id);
      expect(procedures.at(-1)?.category_name).toBe("Categoria teste");
    },
  );

  it("should_enrich_entry_with_procedure_from_second_catalog_page", async () => {
    const categoryId = "fe90a7f4-45c9-4a52-9b4f-fb7ce6f50a9f";
    const procedureId = "00000000-0000-4000-8001-000000001001";
    const timestamp = "2026-03-01T00:00:00.000Z";
    const makeProcedure = (index: number) => ({
      id: `00000000-0000-4000-8001-${index.toString().padStart(12, "0")}`,
      category_id: categoryId,
      name: `Procedimento ${index}`,
      counting_unit: "unidade",
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      makeProcedure(index + 1),
    );
    const secondPage = [makeProcedure(1001)];
    const entry = {
      id: "f10a7281-2a42-4fd4-b7f5-d5b7d46d54bd",
      procedure_id: procedureId,
      counting_unit: "unidade historica",
      reference_period: "2026-03-01",
      quantity: "12",
      source: "manual",
      created_at: timestamp,
      updated_at: timestamp,
    };
    const calls: Array<{ table: string; range?: [number, number] }> = [];
    from.mockImplementation((table: string) => {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        lte: () => query,
        order: () => query,
        range: (start: number, end: number) => {
          call.range = [start, end];
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data:
              table === "procedures"
                ? call.range?.[0] === 0
                  ? firstPage
                  : secondPage
                : table === "production_entries"
                  ? [entry]
                  : [
                      {
                        id: categoryId,
                        name: "Categoria teste",
                        active: true,
                        created_at: timestamp,
                        updated_at: timestamp,
                      },
                    ],
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const entries = await listProductionEntries();

    expect(entries[0]).toMatchObject({
      procedure_id: procedureId,
      procedure_name: "Procedimento 1001",
      category_name: "Categoria teste",
      counting_unit: "unidade historica",
    });
    expect(
      calls
        .filter(({ table }) => table === "procedures")
        .map(({ range }) => range),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});
