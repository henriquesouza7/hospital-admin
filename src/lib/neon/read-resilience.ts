import "server-only";

// Explicitly reviewed reads. Naming conventions alone never authorize a retry.
export const ADMIN_READ_TABLES = [
  "admission_targets",
  "audit_logs",
  "doctors",
  "fiscal_imports",
  "monthly_fair_expenses",
  "patients",
  "procedure_categories",
  "procedures",
  "production_entries",
  "production_import_rows",
  "production_imports",
  "products",
  "purchase_order_items",
  "purchase_order_summaries",
  "purchase_orders",
  "suppliers",
  "surgery_appointments",
  "surgery_days",
  "surgery_waitlist",
] as const;

export const ADMIN_READ_RPCS = [
  "get_admission_dashboard_totals",
  "get_surgery_summary",
  "list_admission_entries",
  "list_admission_entries_for_export",
  "list_minor_surgery_audit",
  "list_minor_surgery_transfer_destinations",
  "list_monthly_expense_totals_exact",
  "list_production_entries_for_export",
  "list_purchase_order_items_for_export",
] as const;

const MAX_READ_ATTEMPTS = 3;
const RETRY_DELAY_MS = 100;
const MISSING_CONTEXT = "HOSPITAL_JWT_CONTEXT_MISSING";
const ADMIN_DENIED = "HOSPITAL_ADMIN_ACCESS_DENIED";
const AFTER_GUARD_CONTEXT_LOSS = "Administrator access required";

type Identity = Readonly<{ subject: string; admin: boolean }>;
type Dependencies = Readonly<{
  baseUrl: string;
  getIdentity: () => Promise<Identity | null>;
  refreshToken: () => Promise<string | null>;
  fetch: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
  report: (
    event: Readonly<{
      operation: string;
      attempt: number;
      outcome: "retryable_denial" | "recovered" | "exhausted";
    }>,
  ) => void;
}>;

export function createResilientReadFetch(
  dependencies: Dependencies,
): typeof fetch {
  const base = new URL(dependencies.baseUrl.replace(/\/$/, "") + "/");
  return async (input, init) => {
    // The installed PostgREST client supplies a URL and a reusable string body.
    if (input instanceof Request)
      throw new Error("Unsupported Data API request");
    const url = new URL(String(input));
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error("Unexpected Data API destination");
    }
    const route = url.pathname.slice(base.pathname.length);
    const method = (init?.method ?? "GET").toUpperCase();
    const isTable = (ADMIN_READ_TABLES as readonly string[]).includes(route);
    const rpc = route.startsWith("rpc/") ? route.slice(4) : "";
    const isRpc = (ADMIN_READ_RPCS as readonly string[]).includes(rpc);
    const isRead =
      (isTable && (method === "GET" || method === "HEAD")) ||
      (isRpc && (method === "GET" || method === "POST" || method === "HEAD"));
    if (!isRead) {
      // Mutations and unknown operations are sent exactly once.
      return dependencies.fetch(input, { ...init, cache: "no-store" });
    }

    const identity = await dependencies.getIdentity();
    if (!identity?.subject || !identity.admin) {
      throw new Error("Administrative authentication required");
    }
    const operation = isTable ? route : rpc;
    url.pathname = `${base.pathname}rpc/verified_${operation}`;
    const headers = new Headers(init?.headers);
    headers.set("x-hospital-subject", identity.subject);
    if (!headers.get("authorization")?.startsWith("Bearer ")) {
      throw new Error("Data API authentication required");
    }

    for (let attempt = 1; attempt <= MAX_READ_ATTEMPTS; attempt++) {
      // A distinct signal opts out of React GET memoization for each attempt.
      const signal = init?.signal ?? new AbortController().signal;
      const response = await dependencies.fetch(url, {
        ...init,
        headers: new Headers(headers),
        cache: "no-store",
        signal,
      });
      if (response.ok) {
        if (attempt > 1)
          dependencies.report({ operation, attempt, outcome: "recovered" });
        return response;
      }
      const failure: unknown = await response
        .clone()
        .json()
        .catch(() => null);
      const recoverableDenial =
        response.status === 403 &&
        typeof failure === "object" &&
        failure !== null &&
        "code" in failure &&
        failure.code === "42501" &&
        "message" in failure &&
        (failure.message === MISSING_CONTEXT ||
          failure.message === ADMIN_DENIED ||
          // The SQL entry point has already verified the same user's admin role.
          // Only the original RPC can emit this later denial.
          (isRpc && failure.message === AFTER_GUARD_CONTEXT_LOSS));
      // Each retry rechecks the server session and SQL authorization. A revoked
      // role remains denied; mismatched identities and other errors stop here.
      if (!recoverableDenial) return response;
      dependencies.report({
        operation,
        attempt,
        outcome:
          attempt === MAX_READ_ATTEMPTS ? "exhausted" : "retryable_denial",
      });
      if (attempt === MAX_READ_ATTEMPTS) return response;
      await (
        dependencies.wait ??
        ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
      )(RETRY_DELAY_MS * attempt);
      const current = await dependencies.getIdentity();
      if (!current?.admin || current.subject !== identity.subject) {
        throw new Error("Administrative session changed during read");
      }
      const token = await dependencies.refreshToken();
      if (!token) throw new Error("Data API authentication required");
      headers.set("authorization", `Bearer ${token}`);
    }
    throw new Error("Data API read attempts exhausted");
  };
}
