import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPendingProductionImportRows } from "./repository";

const { from, requireProductionAdmin } = vi.hoisted(() => ({
  from: vi.fn(),
  requireProductionAdmin: vi.fn(),
}));

vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/production/access", () => ({ requireProductionAdmin }));

beforeEach(() => {
  vi.clearAllMocks();
  requireProductionAdmin.mockResolvedValue({ id: "admin" });
});

describe("production import repository", () => {
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
