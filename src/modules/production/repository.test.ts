import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductionEntry,
  DuplicateProductionRecordError,
  loadProductionIndicatorSource,
  listProcedureCategories,
  listProductionEntries,
  listProductionEntriesForExport,
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
  it("should_read_production_export_from_one_bounded_snapshot", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          reference_period: "2026-10-01",
          category_name: "Categoria sintética",
          procedure_name: "Procedimento sintético",
          quantity: "2.000",
          counting_unit: "procedimentos",
          source: "realizado",
        },
      ],
      error: null,
    });

    await expect(
      listProductionEntriesForExport("2026-10-01", "2026-11-01", 10_001),
    ).resolves.toEqual([
      {
        reference_period: "2026-10-01",
        category_name: "Categoria sintética",
        procedure_name: "Procedimento sintético",
        quantity: "2.000",
        counting_unit: "procedimentos",
        source: "realizado",
      },
    ]);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("list_production_entries_for_export", {
      p_start: "2026-10-01",
      p_through_exclusive: "2026-11-01",
      p_limit: 10_001,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("should_filter_indicator_entries_to_the_requested_year", async () => {
    const categoryId = "00000000-0000-4000-8000-000000000101";
    const procedureId = "00000000-0000-4000-8000-000000000201";
    const createdAt = "2026-03-01T00:00:00.000Z";
    const rowsByTable: Record<string, unknown[]> = {
      procedure_categories: [
        {
          id: categoryId,
          name: "Laboratório",
          active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      procedures: [
        {
          id: procedureId,
          category_id: categoryId,
          name: "Hemograma",
          counting_unit: "exames",
          active: false,
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      production_entries: [
        {
          id: "00000000-0000-4000-8000-000000000301",
          procedure_id: procedureId,
          counting_unit: "procedimentos",
          reference_period: "2026-02-01",
          quantity: 0,
          source: "realizado",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
    };
    const filters: Array<[string, string, string]> = [];
    from.mockImplementation((table: string) => {
      const query = {
        select: () => query,
        gte: (column: string, value: string) => {
          filters.push([table, column, value]);
          return query;
        },
        lte: (column: string, value: string) => {
          filters.push([table, column, value]);
          return query;
        },
        order: () => query,
        range: async () => ({ data: rowsByTable[table], error: null }),
      };
      return query;
    });

    const source = await loadProductionIndicatorSource({
      from: "2026-01",
      to: "2026-12",
    });

    expect(requireProductionAdmin).toHaveBeenCalledOnce();
    expect(from.mock.calls.map(([table]) => table).sort()).toEqual([
      "procedure_categories",
      "procedures",
      "production_entries",
    ]);
    expect(source.procedures[0]).toMatchObject({
      id: procedureId,
      active: false,
      category_name: "Laboratório",
    });
    expect(source.entries[0]).toMatchObject({
      procedure_id: procedureId,
      procedure_name: "Hemograma",
      category_id: categoryId,
      category_name: "Laboratório",
      counting_unit: "procedimentos",
      quantity: "0",
    });
    expect(filters).toEqual([
      ["production_entries", "reference_period", "2026-01-01"],
      ["production_entries", "reference_period", "2026-12-01"],
    ]);
  });

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

  it("should_paginate_procedure_categories_in_deterministic_order", async () => {
    const timestamp = "2026-03-01T00:00:00.000Z";
    const makeCategory = (index: number) => ({
      id: `00000000-0000-4000-8002-${index.toString().padStart(12, "0")}`,
      name: `Categoria ${index.toString().padStart(4, "0")}`,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      makeCategory(index + 1),
    );
    const secondPage = [makeCategory(1001)];
    const calls: Array<{
      orders: Array<[string, { ascending: boolean }]>;
      range?: [number, number];
    }> = [];
    from.mockImplementation(() => {
      const call = { orders: [], range: undefined } as (typeof calls)[number];
      calls.push(call);
      const query = {
        select: () => query,
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
            data: call.range?.[0] === 0 ? firstPage : secondPage,
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const categories = await listProcedureCategories();

    expect(calls.map(({ range }) => range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(calls.map(({ orders }) => orders)).toEqual([
      [
        ["name", { ascending: true }],
        ["id", { ascending: true }],
      ],
      [
        ["name", { ascending: true }],
        ["id", { ascending: true }],
      ],
    ]);
    expect(categories).toHaveLength(1001);
    expect(categories.at(-1)?.id).toBe(makeCategory(1001).id);
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

  it("should_preserve_procedure_category_from_second_category_page", async () => {
    const categoryId = "00000000-0000-4000-8002-000000001001";
    const timestamp = "2026-03-01T00:00:00.000Z";
    const makeCategory = (index: number) => ({
      id: `00000000-0000-4000-8002-${index.toString().padStart(12, "0")}`,
      name: `Categoria ${index}`,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const firstCategoryPage = Array.from({ length: 1000 }, (_, index) =>
      makeCategory(index + 1),
    );
    const secondCategoryPage = [makeCategory(1001)];
    const procedure = {
      id: "00000000-0000-4000-8001-000000000001",
      category_id: categoryId,
      name: "Procedimento com categoria posterior",
      counting_unit: "unidade",
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const categoryCalls: Array<{ range?: [number, number] }> = [];
    from.mockImplementation((table: string) => {
      const call: (typeof categoryCalls)[number] = {};
      if (table === "procedure_categories") categoryCalls.push(call);
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
                ? [procedure]
                : call.range?.[0] === 0
                  ? firstCategoryPage
                  : secondCategoryPage,
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const procedures = await listProductionProcedures();

    expect(procedures[0]).toMatchObject({
      category_id: categoryId,
      category_name: "Categoria 1001",
    });
    expect(categoryCalls.map(({ range }) => range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("should_enrich_entry_with_procedure_from_second_catalog_page", async () => {
    const categoryId = "00000000-0000-4000-8002-000000001001";
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
    const makeCategory = (index: number) => ({
      id: `00000000-0000-4000-8002-${index.toString().padStart(12, "0")}`,
      name: `Categoria ${index}`,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const firstCategoryPage = Array.from({ length: 1000 }, (_, index) =>
      makeCategory(index + 1),
    );
    const secondCategoryPage = [makeCategory(1001)];
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
                  : call.range?.[0] === 0
                    ? firstCategoryPage
                    : secondCategoryPage,
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const entries = await listProductionEntries();

    expect(entries[0]).toMatchObject({
      procedure_id: procedureId,
      procedure_name: "Procedimento 1001",
      category_name: "Categoria 1001",
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
    expect(
      calls
        .filter(({ table }) => table === "procedure_categories")
        .map(({ range }) => range),
    ).toEqual(
      [
        [0, 999],
        [1000, 1999],
        [0, 999],
        [1000, 1999],
      ].sort((left, right) => left[0] - right[0]),
    );
  });
});
