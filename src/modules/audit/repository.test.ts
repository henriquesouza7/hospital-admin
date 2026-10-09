import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  or: vi.fn(),
  range: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/neon/data-api", () => ({
  getNeonDataApiClient: () => ({ from: mocks.from }),
}));

import { AUDIT_MAX_PAGE } from "./domain";
import { listAdministrativeAudit } from "./repository";

describe("administrative audit repository", () => {
  const query = {
    select: mocks.select,
    order: mocks.order,
    gte: mocks.gte,
    lt: mocks.lt,
    eq: mocks.eq,
    in: mocks.in,
    or: mocks.or,
    range: mocks.range,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.from.mockReturnValue(query);
    for (const method of [
      mocks.select,
      mocks.order,
      mocks.gte,
      mocks.lt,
      mocks.eq,
      mocks.in,
      mocks.or,
    ]) {
      method.mockReturnValue(query);
    }
    mocks.range.mockResolvedValue({ data: [], error: null });
  });

  it("should_require_administrator_before_reading_any_audit_rows", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("blocked"));
    await expect(
      listAdministrativeAudit({
        from: null,
        through: null,
        module: "todos",
        entityType: null,
        action: null,
        actorId: null,
        page: 1,
        snapshotAt: null,
        snapshotId: null,
      }),
    ).rejects.toThrow("blocked");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("should_use_an_exclusive_end_date_filter", async () => {
    await listAdministrativeAudit({
      from: null,
      through: "2026-11-01T00:00:00.000-03:00",
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 1,
      snapshotAt: null,
      snapshotId: null,
    });

    expect(mocks.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-11-01T00:00:00.000-03:00",
    );
  });

  it("should_stop_pagination_and_report_limit_when_max_page_has_more_rows", async () => {
    mocks.range.mockResolvedValue({
      data: Array.from({ length: 51 }, (_, index) => ({
        id: String(index + 1),
        actor_id: "admin",
        entity_type: "doctor",
        entity_id: null,
        action: "updated",
        payload: {},
        created_at: "2026-10-08T12:00:00Z",
      })),
      error: null,
    });

    const result = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: AUDIT_MAX_PAGE,
      snapshotAt: "2026-10-08T12:00:00Z",
      snapshotId: "10000",
    });

    expect(result.events).toHaveLength(50);
    expect(result).toMatchObject({
      page: AUDIT_MAX_PAGE,
      hasMore: false,
      limitReached: true,
      snapshot: { createdAt: "2026-10-08T12:00:00Z", id: "10000" },
    });
    expect(mocks.range).toHaveBeenCalledWith(
      (AUDIT_MAX_PAGE - 1) * 50,
      AUDIT_MAX_PAGE * 50,
    );
  });

  it("should_apply_module_filters_and_stable_pagination_for_admins", async () => {
    await expect(
      listAdministrativeAudit({
        from: "2026-10-01T00:00:00.000-03:00",
        through: "2026-11-01T00:00:00.000-03:00",
        module: "internacoes",
        entityType: null,
        action: "updated",
        actorId: "admin",
        page: 2,
        snapshotAt: "2026-11-01T00:00:00.000Z",
        snapshotId: "100",
      }),
    ).resolves.toEqual({
      events: [],
      page: 2,
      hasMore: false,
      limitReached: false,
      snapshot: { createdAt: "2026-11-01T00:00:00.000Z", id: "100" },
    });
    expect(mocks.from).toHaveBeenCalledWith("audit_logs");
    expect(mocks.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(mocks.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(mocks.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-11-01T00:00:00.000-03:00",
    );
    expect(mocks.in).toHaveBeenCalledWith("entity_type", [
      "doctor",
      "admission_entry",
      "admission_target",
      "admission_import",
    ]);
    expect(mocks.range).toHaveBeenCalledWith(50, 100);
  });

  it("should_anchor_later_pages_to_the_first_page_snapshot", async () => {
    await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 2,
      snapshotAt: "2026-10-09T10:00:00.123Z",
      snapshotId: "42",
    });

    expect(mocks.or).toHaveBeenCalledWith(
      "created_at.lt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.lte.42)",
    );
    expect(mocks.range).toHaveBeenCalledWith(50, 100);
  });

  it("should_capture_the_newest_row_as_the_first_page_snapshot", async () => {
    mocks.range.mockResolvedValue({
      data: [
        {
          id: "42",
          actor_id: "admin",
          entity_type: "doctor",
          entity_id: null,
          action: "updated",
          payload: {},
          created_at: "2026-10-09T10:00:00.123Z",
        },
      ],
      error: null,
    });

    const result = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 1,
      snapshotAt: null,
      snapshotId: null,
    });

    expect(result.snapshot).toEqual({
      createdAt: "2026-10-09T10:00:00.123Z",
      id: "42",
    });
  });

  it("should_restart_at_page_one_when_the_snapshot_is_missing", async () => {
    const result = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 2,
      snapshotAt: null,
      snapshotId: null,
    });

    expect(result.page).toBe(1);
    expect(mocks.or).not.toHaveBeenCalled();
    expect(mocks.range).toHaveBeenCalledWith(0, 50);
  });
});
