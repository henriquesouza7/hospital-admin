import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import {
  ProductCreateForm,
  ProductList,
} from "@/modules/finance/pharmacy/product-management";
import { listProducts } from "@/modules/finance/pharmacy/repository";

export default async function LaboratoryProductsPage() {
  const sector = "laboratorio" as const;
  const products = await listProducts(sector);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Laboratório"
        title="Produtos"
        description="Cadastre materiais e insumos do laboratório. O preço pertence a cada item de compra."
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
      <ProductCreateForm sector={sector} />
      <section className="space-y-3">
        <h2 className="font-semibold">
          Produtos cadastrados{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({products.length})
          </span>
        </h2>
        <ProductList products={products} />
      </section>
    </div>
  );
}
