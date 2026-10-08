import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  AUDIT_MAX_PAGE,
  AUDIT_PAGE_SIZE,
  entityTypesForModule,
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
}>;

export async function listAdministrativeAudit(filters: AuditFilters) {
  await requireAdmin();
  const page = Math.min(Math.max(filters.page, 1), AUDIT_MAX_PAGE);
  const offset = (page - 1) * AUDIT_PAGE_SIZE;
  if (
    filters.module !== "todos" &&
    filters.entityType &&
    !entityTypesForModule(filters.module).includes(filters.entityType)
  ) {
    return { events: [], page, hasMore: false };
  }
  let query = getNeonDataApiClient()
    .from("audit_logs")
    .select("id,actor_id,entity_type,entity_id,action,payload,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.through) query = query.lte("created_at", filters.through);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  else if (filters.module !== "todos") {
    const entities = entityTypesForModule(filters.module);
    if (entities.length === 0) return { events: [], page, hasMore: false };
    query = query.in("entity_type", [...entities]);
  }

  const { data, error } = await query.range(offset, offset + AUDIT_PAGE_SIZE);
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar a auditoria administrativa.");
  }
  const rows = z.array(rowSchema).parse(data);
  return {
    events: rows.slice(0, AUDIT_PAGE_SIZE),
    page,
    hasMore: rows.length > AUDIT_PAGE_SIZE,
  };
}
