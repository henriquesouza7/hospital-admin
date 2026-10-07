import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  AdmissionTargetCreateForm,
  AdmissionTargetsTable,
} from "@/modules/admissions/admission-management";
import { listAdmissionTargets } from "@/modules/admissions/repository";
import { saoPauloToday } from "@/modules/admissions/period";

export const dynamic = "force-dynamic";

export default async function AdmissionTargetsPage() {
  const today = saoPauloToday();
  const year = today.getUTCFullYear();
  const month = `${year}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const targets = await listAdmissionTargets("1900-01-01", "2101-01-01");
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Internações"
        title="Metas"
        description="Configure metas administrativas mensais e anuais para o hospital. Metas não alteram nem substituem os lançamentos realizados."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/internacoes"
          >
            Dashboard
          </Link>
        }
      />
      <AdmissionTargetCreateForm defaultYear={year} defaultMonth={month} />
      <AdmissionTargetsTable targets={targets} />
      <p className="text-sm text-muted-foreground">
        A granularidade é hospitalar nesta etapa. Não há metas individuais por
        médico definidas nos requisitos do módulo.
      </p>
    </div>
  );
}
