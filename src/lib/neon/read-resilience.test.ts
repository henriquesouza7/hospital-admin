import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));
import {
  ADMIN_READ_RPCS,
  ADMIN_READ_TABLES,
  createResilientReadFetch,
} from "./read-resilience";

const baseUrl = "https://qa.example.test/neondb/rest/v1";
const initial = {
  method: "POST",
  headers: { Authorization: "Bearer original-private-token" },
  body: "{}",
};
const denied = (message = "HOSPITAL_JWT_CONTEXT_MISSING", code = "42501") =>
  Response.json({ code, message, details: "private-detail" }, { status: 403 });
function setup() {
  const transport = vi.fn<typeof fetch>();
  const identity = vi.fn(async () => ({
    subject: "synthetic-admin",
    admin: true,
  }));
  const refresh = vi.fn(
    async (): Promise<string | null> => "renewed-private-token",
  );
  const report = vi.fn();
  const wait = vi.fn(async () => {});
  const request = createResilientReadFetch({
    baseUrl,
    getIdentity: identity,
    refreshToken: refresh,
    fetch: transport,
    report,
    wait,
  });
  return { transport, identity, refresh, report, wait, request };
}

describe("administrative read recovery", () => {
  it("should_recover_when_claims_are_missing_then_restored", async () => {
    const s = setup();
    s.transport
      .mockResolvedValueOnce(denied())
      .mockResolvedValueOnce(Response.json({ total: 7 }));
    const response = await s.request(
      `${baseUrl}/rpc/get_surgery_summary`,
      initial,
    );
    expect(await response.json()).toEqual({ total: 7 });
    expect(s.transport).toHaveBeenCalledTimes(2);
    expect(s.refresh).toHaveBeenCalledOnce();
    expect(s.transport.mock.calls[1][0].toString()).toBe(
      `${baseUrl}/rpc/verified_get_surgery_summary`,
    );
    expect(
      new Headers(s.transport.mock.calls[1][1]?.headers).get("authorization"),
    ).toBe("Bearer renewed-private-token");
    expect(
      new Headers(s.transport.mock.calls[1][1]?.headers).get(
        "x-hospital-subject",
      ),
    ).toBe("synthetic-admin");
    expect(s.transport.mock.calls[0][1]?.signal).not.toBe(
      s.transport.mock.calls[1][1]?.signal,
    );
    expect(s.report.mock.calls.map(([event]) => event.outcome)).toEqual([
      "retryable_denial",
      "recovered",
    ]);
    expect(JSON.stringify(s.report.mock.calls)).not.toMatch(
      /private|synthetic-admin|Bearer/,
    );
  });

  it("should_preserve_explicit_error_when_context_remains_absent", async () => {
    const s = setup();
    s.transport.mockImplementation(async () => denied());
    const response = await s.request(
      `${baseUrl}/rpc/get_surgery_summary`,
      initial,
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("42501");
    expect(s.transport).toHaveBeenCalledTimes(3);
    expect(s.refresh).toHaveBeenCalledTimes(2);
    expect(s.report).toHaveBeenLastCalledWith({
      operation: "get_surgery_summary",
      attempt: 3,
      outcome: "exhausted",
    });
  });

  it.each([
    "HOSPITAL_SUBJECT_MISMATCH",
    "permission denied for table patients",
    "malformed context",
  ])("should_not_retry_when_permission_failure_is_%s", async (message) => {
    const s = setup();
    s.transport.mockResolvedValueOnce(denied(message));
    expect(
      (await s.request(`${baseUrl}/rpc/get_surgery_summary`, initial)).status,
    ).toBe(403);
    expect(s.transport).toHaveBeenCalledOnce();
    expect(s.refresh).not.toHaveBeenCalled();
  });

  it("should_retry_the_original_rpc_denial_after_the_sql_entry_guard", async () => {
    const s = setup();
    s.transport
      .mockResolvedValueOnce(denied("Administrator access required"))
      .mockResolvedValueOnce(Response.json({ total: 7 }));
    const response = await s.request(
      `${baseUrl}/rpc/get_surgery_summary`,
      initial,
    );
    expect(response.ok).toBe(true);
    expect(s.transport).toHaveBeenCalledTimes(2);
    expect(s.refresh).toHaveBeenCalledOnce();
  });

  it("should_retry_transient_admin_guard_denial_with_new_authentication", async () => {
    const s = setup();
    s.transport
      .mockResolvedValueOnce(denied("HOSPITAL_ADMIN_ACCESS_DENIED"))
      .mockResolvedValueOnce(Response.json([{ id: "synthetic-record" }]));
    const response = await s.request(`${baseUrl}/patients?select=id`, {
      ...initial,
      method: "GET",
      body: undefined,
    });
    expect(response.ok).toBe(true);
    expect(s.transport).toHaveBeenCalledTimes(2);
    expect(s.identity).toHaveBeenCalledTimes(2);
    expect(s.refresh).toHaveBeenCalledOnce();
  });

  it("should_keep_persistent_database_denial_explicit", async () => {
    const s = setup();
    s.transport.mockImplementation(async () =>
      denied("HOSPITAL_ADMIN_ACCESS_DENIED"),
    );
    const response = await s.request(
      `${baseUrl}/rpc/get_surgery_summary`,
      initial,
    );
    expect(response.status).toBe(403);
    expect((await response.json()).message).toBe(
      "HOSPITAL_ADMIN_ACCESS_DENIED",
    );
    expect(s.transport).toHaveBeenCalledTimes(3);
  });

  it("should_not_retry_the_original_rpc_message_on_a_table_read", async () => {
    const s = setup();
    s.transport.mockResolvedValueOnce(denied("Administrator access required"));
    const response = await s.request(`${baseUrl}/patients?select=id`, {
      ...initial,
      method: "GET",
      body: undefined,
    });
    expect(response.status).toBe(403);
    expect(s.transport).toHaveBeenCalledOnce();
  });

  it.each([
    "create_surgery_day",
    "update_doctor",
    "import_admission_entries",
    "unknown_rpc",
  ])("should_never_retry_mutation_or_unknown_rpc_%s", async (rpc) => {
    const s = setup();
    s.transport.mockResolvedValueOnce(denied());
    await s.request(`${baseUrl}/rpc/${rpc}`, initial);
    expect(s.transport).toHaveBeenCalledOnce();
    expect(s.transport.mock.calls[0][0]).toBe(`${baseUrl}/rpc/${rpc}`);
    expect(s.identity).not.toHaveBeenCalled();
  });

  it.each(["POST", "PATCH", "DELETE"])(
    "should_not_retry_table_%s",
    async (method) => {
      const s = setup();
      s.transport.mockResolvedValueOnce(denied());
      await s.request(`${baseUrl}/suppliers?id=eq.synthetic`, {
        ...initial,
        method,
      });
      expect(s.transport).toHaveBeenCalledOnce();
    },
  );

  it("should_guard_even_empty_table_reads_and_preserve_filters", async () => {
    const s = setup();
    s.transport
      .mockResolvedValueOnce(denied())
      .mockResolvedValueOnce(Response.json([]));
    const response = await s.request(
      `${baseUrl}/patients?select=id&name=eq.synthetic`,
      { ...initial, method: "GET", body: undefined },
    );
    expect(await response.json()).toEqual([]);
    expect(s.transport.mock.calls[0][0].toString()).toBe(
      `${baseUrl}/rpc/verified_patients?select=id&name=eq.synthetic`,
    );
    expect(s.transport).toHaveBeenCalledTimes(2);
  });

  it("should_block_non_admin_before_querying", async () => {
    const s = setup();
    s.identity.mockResolvedValue({ subject: "synthetic-basic", admin: false });
    await expect(
      s.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
    ).rejects.toThrow("Administrative authentication required");
    expect(s.transport).not.toHaveBeenCalled();
  });

  it("should_not_return_another_users_data_when_session_changes", async () => {
    const s = setup();
    s.transport
      .mockResolvedValueOnce(denied())
      .mockResolvedValueOnce(Response.json({ forbidden: true }));
    s.identity
      .mockResolvedValueOnce({ subject: "synthetic-admin", admin: true })
      .mockResolvedValueOnce({ subject: "different-user", admin: true });
    await expect(
      s.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
    ).rejects.toThrow("session changed");
    expect(s.transport).toHaveBeenCalledOnce();
  });

  it("should_stop_when_renewal_has_no_token", async () => {
    const s = setup();
    s.transport.mockResolvedValueOnce(denied());
    s.refresh.mockResolvedValue(null);
    await expect(
      s.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
    ).rejects.toThrow("authentication required");
    expect(s.transport).toHaveBeenCalledOnce();
  });

  it("should_not_retry_network_or_invalid_jwt_failures", async () => {
    const s = setup();
    s.transport.mockRejectedValueOnce(new Error("network"));
    await expect(
      s.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
    ).rejects.toThrow("network");
    s.transport.mockResolvedValueOnce(denied("invalid JWT", "PGRST301"));
    expect(
      (await s.request(`${baseUrl}/rpc/get_surgery_summary`, initial)).status,
    ).toBe(403);
    expect(s.refresh).not.toHaveBeenCalled();
  });

  it("should_isolate_concurrent_users_and_retry_budgets", async () => {
    const a = setup(),
      b = setup();
    b.identity.mockResolvedValue({ subject: "second-admin", admin: true });
    a.transport
      .mockResolvedValueOnce(denied())
      .mockResolvedValueOnce(Response.json({ owner: "a" }));
    b.transport.mockResolvedValueOnce(Response.json({ owner: "b" }));
    const [ar, br] = await Promise.all([
      a.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
      b.request(`${baseUrl}/rpc/get_surgery_summary`, initial),
    ]);
    expect(await ar.json()).toEqual({ owner: "a" });
    expect(await br.json()).toEqual({ owner: "b" });
    expect(
      new Headers(a.transport.mock.calls[1][1]?.headers).get(
        "x-hospital-subject",
      ),
    ).toBe("synthetic-admin");
    expect(
      new Headers(b.transport.mock.calls[0][1]?.headers).get(
        "x-hospital-subject",
      ),
    ).toBe("second-admin");
    expect(b.refresh).not.toHaveBeenCalled();
  });

  it("should_cover_all_repository_relations_and_provide_invoker_wrappers", () => {
    const migration = readFileSync(
      "db/migrations/20261029190000_guard_administrative_reads.sql",
      "utf8",
    );
    const files: string[] = [];
    function visit(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.name === "repository.ts") files.push(path);
      }
    }
    visit("src/modules");
    for (const file of files) {
      for (const match of readFileSync(file, "utf8").matchAll(
        /\.from\("([a-z_]+)"\)/g,
      )) {
        expect(ADMIN_READ_TABLES).toContain(match[1]);
      }
    }
    for (const name of [...ADMIN_READ_TABLES, ...ADMIN_READ_RPCS]) {
      expect(migration).toContain(`create function public.verified_${name}(`);
    }
    expect(migration).not.toMatch(
      /security definer|disable row level security|bypassrls|set_config/i,
    );
  });
});
