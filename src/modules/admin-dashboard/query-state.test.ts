import { describe, expect, it, vi } from "vitest";
import {
  captureDashboardQuery,
  dashboardQueryErrorMessage,
} from "./query-state";

describe("dashboard query state", () => {
  it("should_explain_forbidden_queries_without_exposing_database_codes", () => {
    expect(dashboardQueryErrorMessage("42501", "a Produção")).toBe(
      "Sem permissão para consultar a Produção. Solicite revisão à administração.",
    );
  });

  it("should_use_a_generic_message_for_other_query_failures", () => {
    expect(dashboardQueryErrorMessage("08006", "os totais financeiros")).toBe(
      "Não foi possível consultar os totais financeiros.",
    );
  });

  it("should_return_available_data_when_query_succeeds", async () => {
    const onFailure = vi.fn();
    const result = await captureDashboardQuery(
      async () => ({ total: 12 }),
      onFailure,
    );

    expect(result).toEqual({ kind: "available", data: { total: 12 } });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("should_mark_only_the_failed_query_unavailable_without_zero_fallback", async () => {
    const onFailure = vi.fn();
    const result = await captureDashboardQuery(async () => {
      throw Object.assign(new Error("Database failure"), { code: "42501" });
    }, onFailure);

    expect(result).toEqual({ kind: "unavailable", code: "42501" });
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("should_preserve_framework_redirects_reported_by_the_failure_handler", async () => {
    const redirect = new Error("redirect:/login?error=forbidden");
    const result = captureDashboardQuery(
      async () => {
        throw new Error("Database failure");
      },
      () => {
        throw redirect;
      },
    );

    await expect(result).rejects.toBe(redirect);
  });
});
