import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import { PurchaseOrderForm } from "@/modules/finance/pharmacy/purchase-order-form";
import {
  listActiveSuppliers,
  listProducts,
} from "@/modules/finance/pharmacy/repository";

const errorMessages: Record<string, string> = {
  validation:
    "Revise os campos e inclua ao menos um produto com valores válidos.",
  save: "Não foi possível salvar. Confira se o fornecedor e todos os produtos estão ativos.",
};

export default async function NewLaboratoryPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sector = "laboratorio" as const;
  const [{ error }, suppliers, products] = await Promise.all([
    searchParams,
    listActiveSuppliers(),
    listProducts(sector, false),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Laboratório"
        title="Novo pedido de compra"
        description="Registre fornecedor, data, itens e preços praticados nesta compra."
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
      <PurchaseNavigation sector={sector} />
      <PurchaseOrderForm
        suppliers={suppliers}
        products={products}
        sector={sector}
        error={errorMessages[error ?? ""]}
      />
    </div>
  );
}
