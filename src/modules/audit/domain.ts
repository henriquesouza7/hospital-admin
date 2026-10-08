export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_MAX_PAGE = 200;

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
