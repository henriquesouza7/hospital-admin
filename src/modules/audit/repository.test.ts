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
      }),
    ).rejects.toThrow("blocked");
    expect(mocks.from).not.toHaveBeenCalled();
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
    });

    expect(result.events).toHaveLength(50);
    expect(result).toMatchObject({
      page: AUDIT_MAX_PAGE,
      hasMore: false,
      limitReached: true,
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
      }),
    ).resolves.toEqual({
      events: [],
      page: 2,
      hasMore: false,
      limitReached: false,
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
});
