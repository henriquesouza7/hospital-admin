import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FiscalImportForm } from "@/modules/finance/fiscal-import/fiscal-import-form";
import {
  listActiveSuppliers,
  listProducts,
} from "@/modules/finance/pharmacy/repository";
import { financeSectorSchema } from "@/modules/finance/pharmacy/validation";

export default async function FiscalImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    setor?: string | string[];
    erro?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const sectorValue = typeof params.setor === "string" ? params.setor : "";
  const initialSector = financeSectorSchema.safeParse(sectorValue).success
    ? (sectorValue as "farmacia" | "laboratorio")
    : "";
  const errorValue =
    typeof params.erro === "string" ? params.erro.slice(0, 300) : "";
  const [suppliers, pharmacyProducts, labProducts] = await Promise.all([
    listActiveSuppliers(),
    listProducts("farmacia", false),
    listProducts("laboratorio", false),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Importação fiscal"
        title="Importação fiscal"
        description="Revise uma NF-e em XML e associe manualmente o fornecedor e os produtos antes de criar um pedido."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/financeiro" />}
          >
            <ArrowLeft aria-hidden="true" />
            Voltar ao Financeiro
          </Button>
        }
      />
      <FiscalImportForm
        suppliers={suppliers}
        products={[...pharmacyProducts, ...labProducts]}
        initialSector={initialSector}
        error={errorValue || undefined}
      />
    </div>
  );
}
