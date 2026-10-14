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
});
