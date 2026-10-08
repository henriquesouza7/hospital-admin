import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireProductionAdmin } from "./access";

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

describe("production administrator access", () => {
  it("allows an authenticated administrator", async () => {
    const user = { id: "fake-admin", role: "admin" };
    hasAdminRole.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({ data: { user } });

    await expect(requireProductionAdmin()).resolves.toBe(user);
  });

  it("redirects an unauthenticated user", async () => {
    hasAdminRole.mockReturnValueOnce(false);
    getSession.mockResolvedValueOnce({ data: { user: null } });

    await expect(requireProductionAdmin()).rejects.toThrow(
      "redirect:/login?error=forbidden",
    );
    expect(redirect).toHaveBeenCalledWith("/login?error=forbidden");
  });

  it("redirects when session configuration fails", async () => {
    getSession.mockRejectedValueOnce(new Error("missing configuration"));

    await expect(requireProductionAdmin()).rejects.toThrow(
      "redirect:/login?error=configuration",
    );
  });
});
