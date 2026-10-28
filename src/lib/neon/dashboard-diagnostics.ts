import "server-only";

import { randomUUID } from "node:crypto";

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
      duration_ms: Math.max(0, Math.round(durationMs)),
      correlation_id: randomUUID(),
    }),
  );
}
