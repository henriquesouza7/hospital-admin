import { PageHeader } from "@/components/page-header";
import { DoctorsManagement } from "@/modules/admissions/doctors-management";
import { listDoctors } from "@/modules/admissions/repository";
import type { Doctor } from "@/modules/admissions/domain";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { parseYearMonth } from "@/modules/admissions/period";

export const dynamic = "force-dynamic";

type AdmissionDoctorsPageProps = Readonly<{
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
  }>;
}>;

export default async function AdmissionDoctorsPage({
  searchParams,
}: AdmissionDoctorsPageProps) {
  const period = parseYearMonth(await searchParams);
  let doctors: Doctor[] = [];
  let loadError = false;
  try {
    doctors = await listDoctors();
  } catch {
    loadError = true;
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Internações"
        title="Médicos"
        description="Cadastre e mantenha a situação dos médicos responsáveis pelos lançamentos administrativos."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={`/internacoes?year=${period.year}&month=${period.month}`}
          >
            Voltar ao dashboard
          </Link>
        }
      />
      {loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Não foi possível carregar os médicos. Atualize a página ou tente
          novamente mais tarde.
        </p>
      ) : null}
      <DoctorsManagement doctors={doctors} loadError={loadError} />
    </div>
  );
}
