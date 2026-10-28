import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFairExpense: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));
vi.mock("./repository", () => ({
  createFairExpense: mocks.createFairExpense,
  DuplicateFairCompetenceError: class extends Error {},
}));

import { createFairExpenseAction } from "./actions";

describe("fair expense actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_preserve_login_redirect_when_fair_session_expires", async () => {
    const formData = new FormData();
    formData.set("competence", "2026-10");
    formData.set("total_amount", "10.00");
    formData.set("notes", "Registro sintético");
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.createFairExpense.mockRejectedValue(redirectError);

    await expect(
      createFairExpenseAction({ status: "idle", message: "" }, formData),
    ).rejects.toBe(redirectError);
  });
});
