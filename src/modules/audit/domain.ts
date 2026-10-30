export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_MAX_PAGE = 200;

export type AuditCursor = Readonly<{
  createdAt: string;
  id: string;
}>;

export type AuditCursorDirection = "after" | "before";

export function buildAuditCursorFilter(cursor: AuditCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

export function buildAuditReverseCursorFilter(cursor: AuditCursor): string {
  return `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`;
}

export function buildAuditPageHref(
  search: Record<string, string | string[] | undefined>,
  page: number,
  cursor: AuditCursor | null,
  direction: AuditCursorDirection = "after",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const normalized = Array.isArray(value)
      ? (value[0] ?? null)
      : (value ?? null);
    if (
      normalized &&
      key !== "page" &&
      key !== "cursor_at" &&
      key !== "cursor_id" &&
      key !== "cursor_history" &&
      key !== "cursor_direction"
    ) {
      params.set(key, normalized);
    }
  }
  params.set("page", String(page));
  if (cursor) {
    params.set("cursor_at", cursor.createdAt);
    params.set("cursor_id", cursor.id);
  }
  if (cursor && direction === "before")
    params.set("cursor_direction", direction);
  return `/auditoria?${params.toString()}`;
}

export const auditModules = [
  "financeiro",
  "internacoes",
  "producao",
  "pequenas-cirurgias",
] as const;

export type AuditModule = (typeof auditModules)[number] | "todos";

const moduleEntityTypes: Readonly<Record<AuditModule, readonly string[]>> = {
  todos: [],
  financeiro: [
    "purchase_order",
    "supplier",
    "product",
    "monthly_fair_expense",
    "fiscal_import",
    "fiscal_import_item",
  ],
  internacoes: [
    "doctor",
    "admission_entry",
    "admission_target",
    "admission_import",
  ],
  producao: [
    "procedure_category",
    "procedure",
    "production_entry",
    "production_import",
  ],
  "pequenas-cirurgias": [
    "surgery_day",
    "surgery_patient",
    "surgery_appointment",
    "surgery_waitlist",
  ],
};

export function moduleForEntity(entityType: string): AuditModule | "outros" {
  for (const auditModule of auditModules) {
    if (moduleEntityTypes[auditModule].includes(entityType)) return auditModule;
  }
  return "outros";
}

const entityLabels: Readonly<Record<string, string>> = {
  purchase_order: "Pedido de compra",
  supplier: "Fornecedor",
  product: "Produto",
  monthly_fair_expense: "Despesa da Feira",
  fiscal_import: "Importação de nota fiscal",
  fiscal_import_item: "Item de nota fiscal",
  doctor: "Médico",
  admission_entry: "Lançamento de internação",
  admission_target: "Meta de internação",
  admission_import: "Importação de internações",
  procedure_category: "Categoria de procedimento",
  procedure: "Procedimento",
  production_entry: "Lançamento de produção",
  production_import: "Importação de produção",
  surgery_day: "Dia de cirurgia",
  surgery_patient: "Cadastro de pessoa",
  surgery_appointment: "Agendamento de cirurgia",
  surgery_waitlist: "Fila de cirurgia",
};

const actionLabels: Readonly<Record<string, string>> = {
  created: "Criado",
  updated: "Atualizado",
  activated: "Ativado",
  deactivated: "Inativado",
  imported: "Importado",
  transferred: "Transferido",
  cancelled: "Cancelado",
  status_changed: "Status alterado",
  capacity_changed: "Capacidade alterada",
};

export function describeAuditEvent(
  entityType: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const subject = entityLabels[entityType] ?? "Registro administrativo";
  const actionLabel = actionLabels[action] ?? "Alteração registrada";
  const source =
    payload.after &&
    typeof payload.after === "object" &&
    !Array.isArray(payload.after)
      ? (payload.after as Record<string, unknown>)
      : payload;
  const allowedName = [
    "doctor",
    "supplier",
    "product",
    "procedure_category",
    "procedure",
  ].includes(entityType);
  const name =
    allowedName && typeof source.name === "string" ? source.name.trim() : "";
  const referenceField: Readonly<Record<string, string>> = {
    monthly_fair_expense: "competence",
    admission_entry: "entry_date",
    admission_target: "reference_period",
    purchase_order: "order_date",
    surgery_day: "procedure_date",
    fiscal_import: "invoice_number",
  };
  const reference = source[referenceField[entityType] ?? ""];
  let context = name || (typeof reference === "string" ? reference : "");
  if (!name && /^\d{4}-\d{2}-\d{2}$/.test(context)) {
    const [year, month, day] = context.split("-");
    context = `${day}/${month}/${year}`;
  } else if (!name && /^\d{4}-\d{2}$/.test(context)) {
    const [year, month] = context.split("-");
    context = `${month}/${year}`;
  }
  return {
    subject,
    actionLabel,
    context: context.slice(0, 100),
    tone:
      action === "cancelled" || action === "deactivated"
        ? "warning"
        : action === "created" || action === "activated"
          ? "positive"
          : "neutral",
  } as const;
}

export function entityTypesForModule(
  auditModule: AuditModule,
): readonly string[] {
  return moduleEntityTypes[auditModule];
}

export function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const protectedText = /^[\s\u0000-\u001f]*[=+@-]/.test(text)
    ? `'${text}`
    : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

export function buildCsv(rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function parseAuditDate(
  value: string | null,
  endOfDay = false,
): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    return null;
  }
  if (!endOfDay) return `${value}T00:00:00.000-03:00`;
  const exclusiveEnd = new Date(timestamp);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const nextDate = exclusiveEnd.toISOString().slice(0, 10);
  return `${nextDate}T00:00:00.000-03:00`;
}
