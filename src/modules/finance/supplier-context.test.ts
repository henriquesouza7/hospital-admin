import { describe, expect, it } from "vitest";
import {
  getPurchaseNavigationLinks,
  getSupplierRevalidationPaths,
  parseSupplierSector,
} from "./supplier-context";

describe("supplier navigation context", () => {
  it("should_preserve_pharmacy_context_when_opening_global_suppliers", () => {
    expect(getPurchaseNavigationLinks("farmacia")).toEqual([
      { href: "/financeiro/farmacia", label: "Pedidos" },
      {
        href: "/financeiro/fornecedores?setor=farmacia",
        label: "Fornecedores",
      },
      { href: "/financeiro/farmacia/produtos", label: "Produtos" },
    ]);
  });

  it("should_preserve_laboratory_context_when_opening_global_suppliers", () => {
    expect(getPurchaseNavigationLinks("laboratorio")).toEqual([
      { href: "/financeiro/laboratorio", label: "Pedidos" },
      {
        href: "/financeiro/fornecedores?setor=laboratorio",
        label: "Fornecedores",
      },
      { href: "/financeiro/laboratorio/produtos", label: "Produtos" },
    ]);
  });

  it("should_reject_unknown_supplier_sector_when_parsing_query", () => {
    expect(parseSupplierSector("internacao")).toBeNull();
    expect(parseSupplierSector(["farmacia", "laboratorio"])).toBeNull();
  });

  it("should_default_legacy_supplier_context_to_pharmacy_when_sector_is_missing", () => {
    expect(parseSupplierSector(undefined)).toBe("farmacia");
  });

  it("should_revalidate_global_suppliers_and_both_purchase_flows", () => {
    expect(getSupplierRevalidationPaths()).toEqual([
      "/financeiro/fornecedores",
      "/financeiro/farmacia",
      "/financeiro/farmacia/pedidos/novo",
      "/financeiro/laboratorio",
      "/financeiro/laboratorio/pedidos/novo",
    ]);
  });
});
