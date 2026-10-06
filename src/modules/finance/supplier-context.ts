import { financeSectorSchema, type FinanceSector } from "./pharmacy/validation";

export function parseSupplierSector(
  value: string | string[] | undefined,
): FinanceSector | null {
  if (value === undefined) return "farmacia";

  const parsed = financeSectorSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function getPurchaseNavigationLinks(sector: FinanceSector) {
  const basePath = `/financeiro/${sector}`;

  return [
    { href: basePath, label: "Pedidos" },
    {
      href: `/financeiro/fornecedores?setor=${sector}`,
      label: "Fornecedores",
    },
    { href: `${basePath}/produtos`, label: "Produtos" },
  ];
}

export function getSupplierRevalidationPaths(): string[] {
  return [
    "/financeiro/fornecedores",
    "/financeiro/farmacia",
    "/financeiro/farmacia/pedidos/novo",
    "/financeiro/laboratorio",
    "/financeiro/laboratorio/pedidos/novo",
  ];
}
