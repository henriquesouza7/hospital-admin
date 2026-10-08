import { PageHeader } from "@/components/page-header";
import {
  ProductionImportHistory,
  ProductionSusImportForm,
} from "@/modules/production-import/production-import-management";
import { currentProductionCompetence } from "@/modules/production/domain";
import { listProductionProcedures } from "@/modules/production/repository";
import {
  listPendingProductionImportRows,
  listProductionImports,
} from "@/modules/production-import/repository";

type ProductionImportsPageProps = Readonly<{
  searchParams: Promise<{ resultado?: string; erro?: string }>;
}>;

const resultMessages: Record<string, string> = {
  confirmado: "Importação confirmada; os novos grupos já foram registrados.",
  reconciliar: "Importação confirmada com grupos pendentes de reconciliação.",
  reconciliado: "Reconciliação concluída e auditada.",
};

export default async function ProductionImportsPage({
  searchParams,
}: ProductionImportsPageProps) {
  const params = await searchParams;
  const [procedures, imports, pendingRows] = await Promise.all([
    listProductionProcedures(),
    listProductionImports(),
    listPendingProductionImportRows(),
  ]);
  const resultMessage =
    typeof params.resultado === "string"
      ? resultMessages[params.resultado]
      : undefined;
  const errorMessage =
    typeof params.erro === "string" ? params.erro : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Produção"
        title="Importação SUS e reconciliação"
        description="Importe volumes administrativos agregados por competência, procedimento e classificação. O sistema não recebe dados individuais de pacientes."
      />
      {resultMessage && (
        <p
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {resultMessage}
        </p>
      )}
      {errorMessage && (
        <p
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      <ProductionSusImportForm
        procedures={procedures}
        defaultPeriod={currentProductionCompetence()}
      />
      <ProductionImportHistory
        imports={imports}
        pendingRows={pendingRows}
        procedures={procedures}
      />
    </div>
  );
}
