import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupplier: vi.fn(),
  createPurchaseOrder: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT_TEST")
      throw error;
  },
}));
vi.mock("../supplier-context", () => ({
  getSupplierRevalidationPaths: () => ["/financeiro/fornecedores"],
}));
vi.mock("./repository", () => ({
  createSupplier: mocks.createSupplier,
  createPurchaseOrder: mocks.createPurchaseOrder,
}));

import { createPurchaseOrderAction, createSupplierAction } from "./actions";

const supplierId = "00000000-0000-4000-8000-000000000001";
const productId = "00000000-0000-4000-8000-000000000002";

describe("finance actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_preserve_login_redirect_when_supplier_session_expires", async () => {
    const formData = new FormData();
    formData.set("name", "Fornecedor sintético");
    formData.set("notes", "");
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.createSupplier.mockRejectedValue(redirectError);

    await expect(
      createSupplierAction({ status: "idle", message: "" }, formData),
    ).rejects.toBe(redirectError);
  });

  it("should_preserve_login_redirect_when_order_session_expires", async () => {
    const formData = new FormData();
    formData.set("sector", "farmacia");
    formData.set("supplier_id", supplierId);
    formData.set("order_date", "2026-10-26");
    formData.set("notes", "");
    formData.set(
      "items",
      JSON.stringify([
        { product_id: productId, quantity: "1", unit_price: "10" },
      ]),
    );
    const redirectError = new Error("NEXT_REDIRECT_TEST");
    mocks.createPurchaseOrder.mockRejectedValue(redirectError);

    await expect(createPurchaseOrderAction(formData)).rejects.toBe(
      redirectError,
    );
  });
});
