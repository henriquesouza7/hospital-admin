import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  SupplierCreateForm,
  SupplierList,
} from "@/modules/finance/pharmacy/supplier-management";
import { listSuppliers } from "@/modules/finance/pharmacy/repository";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import { parseSupplierSector } from "@/modules/finance/supplier-context";
import type { FinanceSector } from "@/modules/finance/pharmacy/validation";

type SuppliersPageProps = {
  searchParams: Promise<{ setor?: string | string[] }>;
};

export default async function SuppliersPage({
  searchParams,
}: SuppliersPageProps) {
  const { setor } = await searchParams;
  const sector = parseSupplierSector(setor);
  if (!sector) notFound();

  const suppliers = await listSuppliers();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Fornecedores"
        description="Mantenha o cadastro global de fornecedores usado nas compras da Farmácia e do Laboratório."
        actions={<BackToOrders sector={sector} />}
      />
      <PurchaseNavigation sector={sector} />
      <SupplierCreateForm />
      <section className="space-y-3">
        <h2 className="font-semibold">
          Fornecedores cadastrados{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({suppliers.length})
          </span>
        </h2>
        <SupplierList suppliers={suppliers} />
      </section>
    </div>
  );
}

function BackToOrders({ sector }: { sector: FinanceSector }) {
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href={`/financeiro/${sector}`} />}
    >
      <ArrowLeft aria-hidden="true" />
      Voltar aos pedidos
    </Button>
  );
}
