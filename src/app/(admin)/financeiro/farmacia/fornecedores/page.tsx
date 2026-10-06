import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  SupplierCreateForm,
  SupplierList,
} from "@/modules/finance/pharmacy/supplier-management";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import { listSuppliers } from "@/modules/finance/pharmacy/repository";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Farmácia"
        title="Fornecedores"
        description="Mantenha os fornecedores ativos para vinculá-los às compras e preserve o histórico ao inativá-los."
        actions={
          <Button
            variant="outline"
            render={<Link href="/financeiro/farmacia" />}
          >
            <ArrowLeft aria-hidden="true" />
            Voltar aos pedidos
          </Button>
        }
      />
      <PurchaseNavigation sector="farmacia" />
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
