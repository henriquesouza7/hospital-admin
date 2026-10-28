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
        cursor: null,
        cursorDirection: "after",
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
      cursor: null,
      cursorDirection: "after",
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
      cursor: { createdAt: "2026-10-08T12:00:00Z", id: "10000" },
      cursorDirection: "after",
    });

    expect(result.events).toHaveLength(50);
    expect(result).toMatchObject({
      page: AUDIT_MAX_PAGE,
      hasMore: false,
      limitReached: true,
      cursor: { createdAt: "2026-10-08T12:00:00Z", id: "10000" },
      nextCursor: { createdAt: "2026-10-08T12:00:00Z", id: "50" },
      previousCursor: { createdAt: "2026-10-08T12:00:00Z", id: "1" },
    });
    expect(mocks.range).toHaveBeenCalledWith(0, 50);
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
        cursor: { createdAt: "2026-11-01T00:00:00.000Z", id: "100" },
        cursorDirection: "after",
      }),
    ).resolves.toEqual({
      events: [],
      page: 2,
      hasMore: false,
      limitReached: false,
      cursor: { createdAt: "2026-11-01T00:00:00.000Z", id: "100" },
      nextCursor: null,
      previousCursor: null,
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
    expect(mocks.or).toHaveBeenCalledWith(
      "created_at.lt.2026-11-01T00:00:00.000Z,and(created_at.eq.2026-11-01T00:00:00.000Z,id.lt.100)",
    );
    expect(mocks.range).toHaveBeenCalledWith(0, 50);
  });

  it("should_anchor_later_pages_to_the_last_displayed_cursor", async () => {
    await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 2,
      cursor: { createdAt: "2026-10-09T10:00:00.123Z", id: "42" },
      cursorDirection: "after",
    });

    expect(mocks.or).toHaveBeenCalledWith(
      "created_at.lt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.lt.42)",
    );
    expect(mocks.range).toHaveBeenCalledWith(0, 50);
  });

  it("should_fetch_the_previous_page_with_one_reverse_cursor", async () => {
    mocks.range.mockResolvedValue({
      data: Array.from({ length: 51 }, (_, index) => ({
        id: String(index + 53),
        actor_id: "admin",
        entity_type: "doctor",
        entity_id: String(index + 53),
        action: "updated",
        payload: {},
        created_at: "2026-10-09T10:00:00.123Z",
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
      page: 1,
      cursor: { createdAt: "2026-10-09T10:00:00.123Z", id: "52" },
      cursorDirection: "before",
    });

    expect(mocks.or).toHaveBeenCalledWith(
      "created_at.gt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.gt.52)",
    );
    expect(mocks.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: true,
    });
    expect(mocks.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: true,
    });
    expect(result.events.map((event) => event.id)).toEqual(
      Array.from({ length: 50 }, (_, index) => String(102 - index)),
    );
    expect(result).toMatchObject({
      page: 1,
      hasMore: true,
      nextCursor: { createdAt: "2026-10-09T10:00:00.123Z", id: "53" },
      previousCursor: null,
    });
  });

  it("should_return_no_next_cursor_when_the_first_page_is_complete", async () => {
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
      cursor: null,
      cursorDirection: "after",
    });

    expect(result.nextCursor).toBeNull();
  });

  it("should_not_skip_or_repeat_rows_when_a_late_commit_has_an_older_timestamp", async () => {
    const createdAt = "2026-10-09T10:00:00.123Z";
    const makeEvent = (id: number, eventCreatedAt = createdAt) => ({
      id: String(id),
      actor_id: "admin",
      entity_type: "doctor",
      entity_id: String(id),
      action: "updated",
      payload: {},
      created_at: eventCreatedAt,
    });
    const persistedRows = Array.from({ length: 60 }, (_, index) =>
      makeEvent(60 - index),
    );

    mocks.range.mockImplementation(async (_start: number, end: number) => {
      const cursorFilter = mocks.or.mock.calls.at(-1)?.[0] as
        string | undefined;
      const cursor = cursorFilter?.match(
        /^created_at\.(lt|gt)\.(.+),and\(created_at\.eq\.(.+),id\.(lt|gt)\.(\d+)\)$/,
      );
      const ascending = mocks.order.mock.calls.at(-2)?.[1]?.ascending === true;
      const rows = persistedRows
        .filter((row) =>
          cursor
            ? cursor[1] === "lt"
              ? row.created_at < cursor[2] ||
                (row.created_at === cursor[3] &&
                  (cursor[4] === "lt"
                    ? BigInt(row.id) < BigInt(cursor[5])
                    : BigInt(row.id) > BigInt(cursor[5])))
              : row.created_at > cursor[2] ||
                (row.created_at === cursor[3] &&
                  (cursor[4] === "gt"
                    ? BigInt(row.id) > BigInt(cursor[5])
                    : BigInt(row.id) < BigInt(cursor[5])))
            : true,
        )
        .sort(
          (left, right) =>
            (left.created_at === right.created_at
              ? Number(BigInt(left.id) - BigInt(right.id))
              : left.created_at.localeCompare(right.created_at)) *
            (ascending ? 1 : -1),
        );
      return { data: rows.slice(0, end + 1), error: null };
    });

    const firstPage = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 1,
      cursor: null,
      cursorDirection: "after",
    });
    expect(firstPage.events).toHaveLength(50);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toEqual({ createdAt, id: "11" });

    persistedRows.push(makeEvent(61, "2026-10-09T09:59:59.999Z"));
    const nextPage = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 2,
      cursor: firstPage.nextCursor,
      cursorDirection: "after",
    });

    const firstPageIds = new Set(firstPage.events.map((event) => event.id));
    expect(nextPage.events.map((event) => event.id)).toEqual([
      ...Array.from({ length: 10 }, (_, index) => String(10 - index)),
      "61",
    ]);
    expect(nextPage.events.some((event) => firstPageIds.has(event.id))).toBe(
      false,
    );
    expect(mocks.or).toHaveBeenCalledWith(
      "created_at.lt.2026-10-09T10:00:00.123Z,and(created_at.eq.2026-10-09T10:00:00.123Z,id.lt.11)",
    );

    const previousPage = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 1,
      cursor: nextPage.previousCursor,
      cursorDirection: "before",
    });

    expect(previousPage.events.map((event) => event.id)).toEqual(
      firstPage.events.map((event) => event.id),
    );
    expect(
      previousPage.events.some((event) =>
        nextPage.events.some((nextEvent) => nextEvent.id === event.id),
      ),
    ).toBe(false);
  });

  it("should_restart_at_page_one_when_the_cursor_is_missing", async () => {
    const result = await listAdministrativeAudit({
      from: null,
      through: null,
      module: "todos",
      entityType: null,
      action: null,
      actorId: null,
      page: 2,
      cursor: null,
      cursorDirection: "after",
    });

    expect(result.page).toBe(1);
    expect(mocks.or).not.toHaveBeenCalled();
    expect(mocks.range).toHaveBeenCalledWith(0, 50);
  });
});
