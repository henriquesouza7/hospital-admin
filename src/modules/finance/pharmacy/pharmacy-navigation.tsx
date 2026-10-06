import Link from "next/link";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/financeiro/farmacia", label: "Pedidos" },
  { href: "/financeiro/farmacia/fornecedores", label: "Fornecedores" },
  { href: "/financeiro/farmacia/produtos", label: "Produtos" },
] as const;

export function PharmacyNavigation() {
  return (
    <nav
      aria-label="Seções da Farmácia"
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
