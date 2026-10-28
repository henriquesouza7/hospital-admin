import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listPendingProductionImportRows,
  listProductionImports,
  reconcileProductionSusImport,
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
vi.mock("@/modules/production/access", () => ({ requireProductionAdmin }));

beforeEach(() => {
  vi.clearAllMocks();
  requireProductionAdmin.mockResolvedValue({ id: "admin" });
});

describe("production import repository", () => {
  it("should_limit_recent_import_listing_in_the_database_query", async () => {
    const rows = [1, 2, 3].map((index) => ({
      id: [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "00000000-0000-4000-8000-000000000003",
      ][index - 1],
      file_sha256: "a".repeat(64),
      reference_period: "2026-10-01",
      row_count: 1,
      imported_group_count: 1,
      pending_group_count: 0,
      status: "confirmed",
      actor_id: "admin",
      created_at: "2026-10-08T12:00:00Z",
    }));
    const range = vi.fn();
    from.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => ({
            range: (start: number, end: number) => {
              range(start, end);
              return Promise.resolve({ data: rows, error: null });
            },
          }),
        }),
      }),
    });

    await expect(listProductionImports(3)).resolves.toHaveLength(3);

    expect(range).toHaveBeenCalledWith(0, 2);
  });

  it("should_send_the_displayed_entry_snapshot_for_reconciliation", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const input = {
      import_id: "00000000-0000-4000-8000-000000000001",
      procedure_id: "00000000-0000-4000-8000-000000000002",
      source_type: "realizado" as const,
      resolution: "keep_existing" as const,
      expected_entry_id: "00000000-0000-4000-8000-000000000003",
      expected_quantity: 10,
      expected_procedure_id: "00000000-0000-4000-8000-000000000002",
      expected_reference_period: "2026-04-01",
      expected_source: "SUS: realizado",
      expected_counting_unit: "exames",
    };

    await reconcileProductionSusImport(input);

    expect(rpc).toHaveBeenCalledWith("reconcile_production_sus_import", {
      p_import_id: input.import_id,
      p_procedure_id: input.procedure_id,
      p_source_type: input.source_type,
      p_resolution: input.resolution,
      p_expected_entry_id: input.expected_entry_id,
      p_expected_quantity: input.expected_quantity,
      p_expected_procedure_id: input.expected_procedure_id,
      p_expected_reference_period: input.expected_reference_period,
      p_expected_source: input.expected_source,
      p_expected_counting_unit: input.expected_counting_unit,
    });
  });

  it("should_attach_current_production_entry_to_pending_reconciliation_rows", async () => {
    const importId = "00000000-0000-4000-8000-000000000001";
    const entryId = "00000000-0000-4000-8000-000000000002";
    const pendingRow = {
      id: "00000000-0000-4000-8000-000000000003",
      import_id: importId,
      source_row_number: 2,
      external_code: null,
      procedure_name_snapshot: "Hemograma",
      source_type: "realizado",
      quantity: "12",
      procedure_id: "00000000-0000-4000-8000-000000000004",
      production_entry_id: entryId,
      imported_counting_unit_snapshot: "exames",
      existing_counting_unit_snapshot: "exames",
      existing_quantity_snapshot: "10",
      status: "pending_reconciliation",
    };
    const currentEntry = {
      id: entryId,
      procedure_id: pendingRow.procedure_id,
      reference_period: "2026-04-01",
      quantity: "11",
      source: "SUS: realizado",
      counting_unit: "exames",
    };
    const calls: Array<{ table: string; selected?: string; ids?: string[] }> =
      [];

    from.mockImplementation((table: string) => {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const query = {
        select: (columns: string) => {
          call.selected = columns;
          return query;
        },
        eq: () => query,
        order: () => query,
        range: () => query,
        in: (_column: string, ids: string[]) => {
          call.ids = ids;
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data:
              table === "production_import_rows"
                ? [pendingRow]
                : [currentEntry],
            error: null,
          }).then(resolve),
      };
      return query;
    });

    const rows = await listPendingProductionImportRows();

    expect(rows[0]?.current_entry).toEqual(currentEntry);
    expect(calls).toEqual([
      expect.objectContaining({ table: "production_import_rows" }),
      expect.objectContaining({
        table: "production_entries",
        ids: [entryId],
      }),
    ]);
    expect(requireProductionAdmin).toHaveBeenCalledOnce();
  });
});
