import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PurchaseOrderDetailView } from "@/modules/finance/purchase-order-views";
import { getPurchaseOrder } from "@/modules/finance/pharmacy/repository";

export default async function LaboratoryPurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
  const order = await getPurchaseOrder(id, "laboratorio");
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Laboratório / Pedidos"
        title="Detalhe do pedido"
        description={order.supplier.name}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/financeiro/laboratorio" />}
          >
            <ArrowLeft aria-hidden="true" />
            Voltar aos pedidos
          </Button>
        }
      />
      <PurchaseOrderDetailView order={order} sector="laboratorio" />
    </div>
  );
}
