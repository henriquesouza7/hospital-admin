import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

const getRequestCorrelationId = cache(() => randomUUID());

type DashboardDiagnostic = Readonly<{
  operation:
    | "admission_totals"
    | "surgery_summary"
    | "finance_totals"
    | "production_indicators"
    | "production_imports"
    | "data_api_auth_token";
  stage: "auth_api" | "data_api" | "response_validation";
  error?: unknown;
  durationMs: number;
}>;

function safeErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const code = error.code;
  return typeof code === "string" &&
    /^(?:[0-9A-Z]{5}|[A-Z][A-Z0-9_]{1,31})$/.test(code)
    ? code
    : null;
}

function safeHttpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = error.status;
  return typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
    ? status
    : null;
}

function safePermissionCategory(error: unknown): string | null {
  if (safeErrorCode(error) !== "42501" || typeof error !== "object" || error === null || !("message" in error) || typeof error.message !== "string") return null;
  if (error.message === "Administrator access required") return "administrator_required";
  if (/^permission denied for schema\b/i.test(error.message)) return "schema_denied";
  if (/^permission denied for function\b/i.test(error.message)) return "function_denied";
  if (/^permission denied for (?:table|relation)\b/i.test(error.message)) return "relation_denied";
  return "other_permission_denied";
}

export function logDashboardQueryFailure({
  operation,
  stage,
  error,
  durationMs,
}: DashboardDiagnostic) {
  console.error(
    "dashboard_query_failed",
    JSON.stringify({
      operation,
      stage,
      code: safeErrorCode(error),
      status: safeHttpStatus(error),
      category: safePermissionCategory(error),
      duration_ms: Math.max(0, Math.round(durationMs)),
      correlation_id: getRequestCorrelationId(),
    }),
  );
}
