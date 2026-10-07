import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseNfeXml } from "./domain";

const mocks = vi.hoisted(() => ({
  createFiscalPurchaseOrder: vi.fn(),
  getFiscalImportPreviewStatus: vi.fn(),
  requireFinanceAdmin: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  authCookieSecret: "test-only-secret-with-at-least-thirty-two-characters",
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../pharmacy/access", () => ({
  requireFinanceAdmin: mocks.requireFinanceAdmin,
}));
vi.mock("@/lib/neon/env", () => ({
  getNeonServerEnv: () => ({ authCookieSecret: mocks.authCookieSecret }),
}));
vi.mock("./repository", async () => {
  const { createHash } = await import("node:crypto");
  return {
    createFiscalPurchaseOrder: mocks.createFiscalPurchaseOrder,
    getFiscalImportPreviewStatus: mocks.getFiscalImportPreviewStatus,
    hashFiscalXml: (bytes: Uint8Array) =>
      createHash("sha256").update(bytes).digest("hex"),
  };
});

import { confirmFiscalImportAction, previewFiscalXmlAction } from "./actions";

const pharmacyXml = readFileSync(
  new URL(
    "../../../../tests/fixtures/fiscal-import/nfe-a-farmacia.xml",
    import.meta.url,
  ),
  "utf8",
);
const laboratoryXml = readFileSync(
  new URL(
    "../../../../tests/fixtures/fiscal-import/nfe-b-laboratorio.xml",
    import.meta.url,
  ),
  "utf8",
);
const revisedPharmacyXml = readFileSync(
  new URL(
    "../../../../tests/fixtures/fiscal-import/nfe-d-revisada-farmacia.xml",
    import.meta.url,
  ),
  "utf8",
);
const productIds = [
  "20000000-0000-4000-8000-000000000002",
  "20000000-0000-4000-8000-000000000003",
];
const supplierId = "20000000-0000-4000-8000-000000000001";
const orderId = "20000000-0000-4000-8000-000000000099";

function fileForm(xml: string): FormData {
  const formData = new FormData();
  formData.set("xml", new File([xml], "nfe.xml", { type: "application/xml" }));
  return formData;
}

function confirmationForm(xml: string, previewToken = ""): FormData {
  const document = parseNfeXml(xml);
  const formData = fileForm(xml);
  formData.set("sector", "farmacia");
  formData.set("supplier_id", supplierId);
  formData.set("order_date", document.orderDate);
  formData.set("notes", "");
  formData.set("preview_token", previewToken);
  formData.set(
    "items",
    JSON.stringify(
      document.items.map((item, index) => ({
        itemNumber: item.itemNumber,
        productId: productIds[index],
        quantity: index === 0 ? "1.500" : item.quantity,
        unitPrice: index === 0 ? "12.34" : item.unitPrice,
      })),
    ),
  );
  return formData;
}

async function redirectFrom(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  throw new Error("Expected the action to redirect.");
}

describe("fiscal import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFinanceAdmin.mockResolvedValue({ id: "admin-user-id" });
    mocks.getFiscalImportPreviewStatus.mockResolvedValue(false);
    mocks.createFiscalPurchaseOrder.mockResolvedValue(orderId);
  });

  it("should_persist_original_invoice_values_and_revised_order_values_after_preview", async () => {
    const preview = await previewFiscalXmlAction(
      { status: "idle" },
      fileForm(revisedPharmacyXml),
    );
    expect(preview.status).toBe("success");
    if (preview.status !== "success") throw new Error("Preview failed.");

    const redirect = await redirectFrom(
      confirmFiscalImportAction(
        confirmationForm(revisedPharmacyXml, preview.previewToken),
      ),
    );

    expect(redirect).toBe(`REDIRECT:/financeiro/farmacia/pedidos/${orderId}`);
    expect(mocks.createFiscalPurchaseOrder).toHaveBeenCalledOnce();
    expect(mocks.createFiscalPurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            product_id: productIds[0],
            quantity: "1.500",
            unit_price: "12.34",
          }),
        ]),
        fiscalItems: expect.arrayContaining([
          expect.objectContaining({
            n_item: "1",
            c_prod: "FICT-FAR-01",
            x_prod: "Produto Fictício Farmácia A",
            u_com: "CX",
            q_com: "2.0004",
            v_un_com: "10.001",
            v_prod: "20.01",
            product_id: productIds[0],
          }),
        ]),
      }),
    );
  });

  it("should_reject_confirmation_without_running_a_server_preview", async () => {
    const redirect = await redirectFrom(
      confirmFiscalImportAction(confirmationForm(pharmacyXml)),
    );

    expect(redirect).toContain("Gere%20uma%20pr%C3%A9via%20v%C3%A1lida");
    expect(mocks.createFiscalPurchaseOrder).not.toHaveBeenCalled();
  });

  it("should_reject_tampered_preview_evidence", async () => {
    const preview = await previewFiscalXmlAction(
      { status: "idle" },
      fileForm(pharmacyXml),
    );
    expect(preview.status).toBe("success");
    if (preview.status !== "success") throw new Error("Preview failed.");
    const token = `${preview.previewToken.slice(0, -1)}${preview.previewToken.endsWith("A") ? "B" : "A"}`;

    const redirect = await redirectFrom(
      confirmFiscalImportAction(confirmationForm(pharmacyXml, token)),
    );

    expect(redirect).toContain("A%20pr%C3%A9via%20%C3%A9%20inv%C3%A1lida");
    expect(mocks.createFiscalPurchaseOrder).not.toHaveBeenCalled();
  });

  it("should_reject_an_xml_changed_after_preview", async () => {
    const preview = await previewFiscalXmlAction(
      { status: "idle" },
      fileForm(pharmacyXml),
    );
    expect(preview.status).toBe("success");
    if (preview.status !== "success") throw new Error("Preview failed.");

    const redirect = await redirectFrom(
      confirmFiscalImportAction(
        confirmationForm(laboratoryXml, preview.previewToken),
      ),
    );

    expect(redirect).toContain("A%20pr%C3%A9via%20%C3%A9%20inv%C3%A1lida");
    expect(mocks.createFiscalPurchaseOrder).not.toHaveBeenCalled();
  });

  it("should_reject_incomplete_or_duplicate_mappings_before_persistence", async () => {
    const preview = await previewFiscalXmlAction(
      { status: "idle" },
      fileForm(pharmacyXml),
    );
    expect(preview.status).toBe("success");
    if (preview.status !== "success") throw new Error("Preview failed.");
    const formData = confirmationForm(pharmacyXml, preview.previewToken);
    formData.set(
      "items",
      JSON.stringify([
        {
          itemNumber: "1",
          productId: productIds[0],
          quantity: "1.500",
          unitPrice: "12.34",
        },
      ]),
    );

    const redirect = await redirectFrom(confirmFiscalImportAction(formData));

    expect(redirect).toContain("Todos%20os%20itens%20originais");
    expect(mocks.createFiscalPurchaseOrder).not.toHaveBeenCalled();
  });
});
