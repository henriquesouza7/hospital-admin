import { PageHeader } from "@/components/page-header";
import {
  ProductionEntryCreateForm,
  ProductionEntryFilters,
  ProductionEntryList,
} from "@/modules/production/production-management";
import { currentProductionCompetence } from "@/modules/production/domain";
import { parseProductionEntryFilters } from "@/modules/production/validation";
import {
  listProductionEntries,
  listProductionProcedures,
} from "@/modules/production/repository";

type EntriesPageProps = Readonly<{
  searchParams: Promise<{
    procedimento?: string | string[];
    de?: string | string[];
    ate?: string | string[];
  }>;
}>;

export default async function ProductionEntriesPage({
  searchParams,
}: EntriesPageProps) {
  const params = await searchParams;
  const parsedFilters = parseProductionEntryFilters(params);
  const filters = parsedFilters.success
    ? {
        procedure_id: parsedFilters.data.procedure_id || undefined,
        from: parsedFilters.data.from || undefined,
        to: parsedFilters.data.to || undefined,
      }
    : {};
  const procedureId =
    typeof params.procedimento === "string" ? params.procedimento : "";
  const from = typeof params.de === "string" ? params.de : "";
  const to = typeof params.ate === "string" ? params.ate : "";
  const [procedures, entries] = await Promise.all([
    listProductionProcedures(),
    listProductionEntries(filters),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Produção"
        title="Lançamentos mensais"
        description="Registre volumes por competência e fonte. Não inclua dados ou identificadores de pacientes."
      />
      <ProductionEntryCreateForm
        procedures={procedures}
        defaultCompetence={currentProductionCompetence()}
      />
      <section className="space-y-4" aria-labelledby="entry-list-title">
        <div>
          <h2 id="entry-list-title" className="text-lg font-semibold">
            Histórico de produção
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Um registro por procedimento, competência e fonte. Correções
            preservam o antes e depois na auditoria.
          </p>
        </div>
        <ProductionEntryFilters
          procedures={procedures}
          procedureId={procedureId}
          from={from}
          to={to}
        />
        <ProductionEntryList entries={entries} procedures={procedures} />
      </section>
    </div>
  );
}
