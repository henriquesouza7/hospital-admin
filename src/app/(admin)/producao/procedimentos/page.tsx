import { PageHeader } from "@/components/page-header";
import {
  CategoryManagement,
  ProcedureCreateForm,
  ProcedureFilters,
  ProcedureList,
} from "@/modules/production/production-management";
import {
  listProcedureCategories,
  listProductionProcedures,
} from "@/modules/production/repository";
import { procedureFilterSchema } from "@/modules/production/validation";

type ProceduresPageProps = Readonly<{
  searchParams: Promise<{
    categoria?: string | string[];
    status?: string | string[];
  }>;
}>;

export default async function ProceduresPage({
  searchParams,
}: ProceduresPageProps) {
  const params = await searchParams;
  const categoryId =
    typeof params.categoria === "string" ? params.categoria : "";
  const requestedStatus =
    typeof params.status === "string" ? params.status : "todos";
  const parsedFilters = procedureFilterSchema.safeParse({
    category_id: categoryId,
    status: requestedStatus,
  });
  const categoryFilter = parsedFilters.success
    ? parsedFilters.data.category_id || undefined
    : undefined;
  const status = parsedFilters.success
    ? (parsedFilters.data.status ?? "todos")
    : "todos";
  const [categories, procedures] = await Promise.all([
    listProcedureCategories(),
    listProductionProcedures({ category_id: categoryFilter, status }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Produção"
        title="Procedimentos e categorias"
        description="Cadastros administrativos podem ser corrigidos e inativados, mantendo o histórico dos lançamentos."
      />
      <CategoryManagement categories={categories} />
      <ProcedureCreateForm categories={categories} />
      <section className="space-y-4" aria-labelledby="procedure-list-title">
        <div>
          <h2 id="procedure-list-title" className="text-lg font-semibold">
            Procedimentos cadastrados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A quantidade de cada lançamento permanece vinculada à unidade deste
            cadastro.
          </p>
        </div>
        <ProcedureFilters
          categories={categories}
          categoryId={categoryId}
          status={status}
        />
        <ProcedureList procedures={procedures} categories={categories} />
      </section>
    </div>
  );
}
