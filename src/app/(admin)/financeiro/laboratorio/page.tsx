import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import { PurchaseOrderList } from "@/modules/finance/purchase-order-views";
import { listPurchaseOrders } from "@/modules/finance/pharmacy/repository";

export default async function LaboratoryPage() {
  const sector = "laboratorio" as const;
  const orders = await listPurchaseOrders(sector);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Laboratório"
        description="Acompanhe compras de materiais e insumos do laboratório com histórico por fornecedor."
        actions={
          <Button render={<Link href="/financeiro/laboratorio/pedidos/novo" />}>
            <PackagePlus aria-hidden="true" />
            Novo pedido
          </Button>
        }
      />
      <PurchaseNavigation sector={sector} />
      <PurchaseOrderList orders={orders} sector={sector} />
    </div>
  );
}
