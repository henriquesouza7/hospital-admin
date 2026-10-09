import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  AUDIT_MAX_PAGE,
  AUDIT_PAGE_SIZE,
  buildAuditCursorFilter,
  entityTypesForModule,
  type AuditCursor,
  type AuditModule,
} from "./domain";

const rowSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  actor_id: z.string().nullable(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  action: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
});

export type AuditEvent = z.infer<typeof rowSchema>;

export type AuditFilters = Readonly<{
  from: string | null;
  through: string | null;
  module: AuditModule;
  entityType: string | null;
  action: string | null;
  actorId: string | null;
  page: number;
  cursor: AuditCursor | null;
  cursorHistory: readonly AuditCursor[];
}>;

export async function listAdministrativeAudit(filters: AuditFilters) {
  await requireAdmin();
  const maxCursorId = BigInt("9223372036854775807");
  const isValidCursor = (cursor: AuditCursor | null) =>
    cursor !== null &&
    z.iso.datetime({ offset: true }).safeParse(cursor.createdAt).success &&
    cursor.id.length <= 19 &&
    /^(?:0|[1-9]\d*)$/.test(cursor.id) &&
    BigInt(cursor.id) <= maxCursorId;
  const validCursor = isValidCursor(filters.cursor) ? filters.cursor : null;
  const expectedHistoryLength = filters.page === 1 ? 0 : filters.page - 2;
  const validHistory =
    filters.cursorHistory.length === expectedHistoryLength &&
    filters.cursorHistory.length < AUDIT_MAX_PAGE &&
    filters.cursorHistory.every(isValidCursor);
  const validNavigation =
    filters.page <= AUDIT_MAX_PAGE &&
    ((filters.page === 1 && filters.cursor === null && validHistory) ||
      (filters.page > 1 && validCursor !== null && validHistory));
  const page = Math.min(
    Math.max(validNavigation ? filters.page : 1, 1),
    AUDIT_MAX_PAGE,
  );
  const cursor = page === 1 ? null : validCursor;
  const cursorHistory = page === 1 ? [] : filters.cursorHistory;
  if (
    filters.module !== "todos" &&
    filters.entityType &&
    !entityTypesForModule(filters.module).includes(filters.entityType)
  ) {
    return {
      events: [],
      page,
      hasMore: false,
      limitReached: false,
      cursor,
      cursorHistory,
      nextCursor: null,
    };
  }
  let query = getNeonDataApiClient()
    .from("audit_logs")
    .select("id,actor_id,entity_type,entity_id,action,payload,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.through) query = query.lt("created_at", filters.through);
  if (cursor) {
    query = query.or(buildAuditCursorFilter(cursor));
  }
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  else if (filters.module !== "todos") {
    const entities = entityTypesForModule(filters.module);
    if (entities.length === 0)
      return {
        events: [],
        page,
        hasMore: false,
        limitReached: false,
        cursor,
        cursorHistory,
        nextCursor: null,
      };
    query = query.in("entity_type", [...entities]);
  }

  const { data, error } = await query.range(0, AUDIT_PAGE_SIZE);
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar a auditoria administrativa.");
  }
  const rows = z.array(rowSchema).parse(data);
  const hasMore = rows.length > AUDIT_PAGE_SIZE;
  const events = rows.slice(0, AUDIT_PAGE_SIZE);
  const lastEvent = events.at(-1);
  return {
    events,
    page,
    hasMore: page < AUDIT_MAX_PAGE && hasMore,
    limitReached: page === AUDIT_MAX_PAGE && hasMore,
    cursor,
    cursorHistory,
    nextCursor:
      hasMore && lastEvent
        ? { createdAt: lastEvent.created_at, id: lastEvent.id }
        : null,
  };
}
