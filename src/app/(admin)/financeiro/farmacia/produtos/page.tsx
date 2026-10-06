import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PharmacyNavigation } from "@/modules/finance/pharmacy/pharmacy-navigation";
import {
  ProductCreateForm,
  ProductList,
} from "@/modules/finance/pharmacy/product-management";
import { listProducts } from "@/modules/finance/pharmacy/repository";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Farmácia"
        title="Produtos"
        description="Cadastre medicamentos e insumos pela apresentação padronizada. O preço pertence a cada item de compra."
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
      <PharmacyNavigation />
      <ProductCreateForm />
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
