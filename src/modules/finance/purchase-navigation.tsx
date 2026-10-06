import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPurchaseNavigationLinks } from "./supplier-context";
import type { FinanceSector } from "./pharmacy/validation";

export function PurchaseNavigation({ sector }: { sector: FinanceSector }) {
  const sectorName = sector === "laboratorio" ? "Laboratório" : "Farmácia";
  const links = getPurchaseNavigationLinks(sector);

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
          nativeButton={false}
          render={<Link href={link.href} />}
        >
          {link.label}
        </Button>
      ))}
    </nav>
  );
}
