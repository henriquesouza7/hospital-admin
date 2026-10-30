import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { logDashboardQueryFailure } from "./dashboard-diagnostics";

describe("logDashboardQueryFailure", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs only safe fields from a Data API error", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    logDashboardQueryFailure({
      operation: "admission_totals",
      stage: "data_api",
      error: {
        code: "42501",
        status: 403,
        message: "private message with a secret token",
        details: "private row data",
      },
      durationMs: 12.6,
    });

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toBe("dashboard_query_failed");
    const details = JSON.parse(String(log.mock.calls[0]?.[1])) as Record<
      string,
      unknown
    >;
    expect(details).toMatchObject({
      operation: "admission_totals",
      stage: "data_api",
      code: "42501",
      status: 403,
      duration_ms: 13,
    });
    expect(details.correlation_id).toEqual(expect.any(String));
    expect(JSON.stringify(details)).not.toContain("private");
    expect(JSON.stringify(details)).not.toContain("token");
  });

  it("rejects unvalidated codes and statuses", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    logDashboardQueryFailure({
      operation: "surgery_summary",
      stage: "data_api",
      error: {
        code: "private-value",
        status: 700,
      },
      durationMs: -4,
    });

    const details = JSON.parse(String(log.mock.calls[0]?.[1])) as Record<
      string,
      unknown
    >;
    expect(details.code).toBeNull();
    expect(details.status).toBeNull();
    expect(details.duration_ms).toBe(0);
  });

  it.each([
    ["Administrator access required", "administrator_required"],
    ["permission denied for schema private_schema", "schema_denied"],
    ["permission denied for function private_function", "function_denied"],
    ["permission denied for table private_table", "relation_denied"],
    ["private arbitrary message", "other_permission_denied"],
  ])("classifies permission errors without logging details", (message, category) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logDashboardQueryFailure({ operation: "surgery_summary", stage: "data_api", error: { code: "42501", message }, durationMs: 1 });
    const detail = JSON.parse(String(log.mock.calls[0]?.[1])) as Record<string, unknown>;
    expect(detail.category).toBe(category);
    expect(JSON.stringify(detail)).not.toContain(message);
  });
});
