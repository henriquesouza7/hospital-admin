import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  AUDIT_MAX_PAGE,
  AUDIT_PAGE_SIZE,
  buildAuditCursorFilter,
  buildAuditReverseCursorFilter,
  entityTypesForModule,
  type AuditCursor,
  type AuditCursorDirection,
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
  cursorDirection: AuditCursorDirection;
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
  const validDirection =
    filters.cursorDirection === "after" || filters.cursorDirection === "before";
  const validNavigation =
    filters.page <= AUDIT_MAX_PAGE &&
    validDirection &&
    ((filters.page === 1 && validCursor === null) ||
      (validCursor !== null &&
        (filters.page > 1 || filters.cursorDirection === "before")));
  const page = Math.min(
    Math.max(validNavigation ? filters.page : 1, 1),
    AUDIT_MAX_PAGE,
  );
  const cursor = validNavigation ? validCursor : null;
  const direction = validNavigation ? filters.cursorDirection : "after";
  const reverse = direction === "before" && cursor !== null;
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
      nextCursor: null,
      previousCursor: null,
    };
  }
  let query = getNeonDataApiClient()
    .from("audit_logs")
    .select("id,actor_id,entity_type,entity_id,action,payload,created_at")
    .order("created_at", { ascending: reverse })
    .order("id", { ascending: reverse });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.through) query = query.lt("created_at", filters.through);
  if (cursor) {
    query = query.or(
      reverse
        ? buildAuditReverseCursorFilter(cursor)
        : buildAuditCursorFilter(cursor),
    );
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
        nextCursor: null,
        previousCursor: null,
      };
    query = query.in("entity_type", [...entities]);
  }

  const { data, error } = await query.range(0, AUDIT_PAGE_SIZE);
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar a auditoria administrativa.");
  }
  const rows = z.array(rowSchema).parse(data);
  const hasMore = reverse || rows.length > AUDIT_PAGE_SIZE;
  const events = rows.slice(0, AUDIT_PAGE_SIZE);
  if (reverse) events.reverse();
  const lastEvent = events.at(-1);
  const firstEvent = events.at(0);
  return {
    events,
    page,
    hasMore: page < AUDIT_MAX_PAGE && hasMore,
    limitReached:
      page === AUDIT_MAX_PAGE && !reverse && rows.length > AUDIT_PAGE_SIZE,
    cursor,
    nextCursor:
      hasMore && lastEvent
        ? { createdAt: lastEvent.created_at, id: lastEvent.id }
        : null,
    previousCursor:
      page > 1 && firstEvent
        ? { createdAt: firstEvent.created_at, id: firstEvent.id }
        : null,
  };
}
