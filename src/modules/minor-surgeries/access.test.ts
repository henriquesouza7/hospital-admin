import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireMinorSurgeriesAdmin } from "./access";

const { getSession, redirect, hasAdminRole } = vi.hoisted(() => ({
  getSession: vi.fn(),
  hasAdminRole: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/roles", () => ({ hasAdminRole }));
vi.mock("@/lib/neon/auth-server", () => ({
  getNeonAuth: () => ({ getSession }),
}));

beforeEach(() => vi.clearAllMocks());

describe("minor surgeries administrator access", () => {
  it("should_allow_an_authenticated_administrator", async () => {
    const user = { id: "synthetic-admin", role: "admin" };
    getSession.mockResolvedValueOnce({ data: { user } });
    hasAdminRole.mockReturnValueOnce(true);

    await expect(requireMinorSurgeriesAdmin()).resolves.toBe(user);
    expect(hasAdminRole).toHaveBeenCalledWith(user);
  });

  it("should_redirect_a_non_administrator", async () => {
    const user = { id: "synthetic-user", role: "user" };
    getSession.mockResolvedValueOnce({ data: { user } });
    hasAdminRole.mockReturnValueOnce(false);

    await expect(requireMinorSurgeriesAdmin()).rejects.toThrow(
      "redirect:/login?error=forbidden",
    );
    expect(redirect).toHaveBeenCalledWith("/login?error=forbidden");
  });

  it("should_redirect_an_unauthenticated_user_without_checking_a_role", async () => {
    getSession.mockResolvedValueOnce({ data: { user: null } });

    await expect(requireMinorSurgeriesAdmin()).rejects.toThrow(
      "redirect:/login?error=forbidden",
    );
    expect(hasAdminRole).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login?error=forbidden");
  });

  it("should_redirect_to_configuration_error_when_session_loading_fails", async () => {
    getSession.mockRejectedValueOnce(
      new Error("synthetic configuration error"),
    );

    await expect(requireMinorSurgeriesAdmin()).rejects.toThrow(
      "redirect:/login?error=configuration",
    );
    expect(redirect).toHaveBeenCalledWith("/login?error=configuration");
  });
});
