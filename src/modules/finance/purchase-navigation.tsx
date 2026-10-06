import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FinanceSector } from "./pharmacy/validation";

export function PurchaseNavigation({ sector }: { sector: FinanceSector }) {
  const basePath = `/financeiro/${sector}`;
  const sectorName = sector === "laboratorio" ? "Laboratório" : "Farmácia";
  const links = [
    { href: basePath, label: "Pedidos" },
    { href: "/financeiro/farmacia/fornecedores", label: "Fornecedores" },
    { href: `${basePath}/produtos`, label: "Produtos" },
  ];

  return (
    <nav
      aria-label={`Seções de ${sectorName}`}
      className="flex flex-wrap gap-2 border-b pb-4"
    >
      {links.map((link) => (
        <Button
          key={link.href}
          variant="outline"
          size="sm"
          render={<Link href={link.href} />}
        >
          {link.label}
        </Button>
      ))}
    </nav>
  );
}
