import { PageHeader } from "@/components/page-header";
import { DoctorsManagement } from "@/modules/admissions/doctors-management";
import type { Doctor } from "@/modules/admissions/domain";
import { listDoctors } from "@/modules/admissions/repository";

export const dynamic = "force-dynamic";

export default async function AdmissionsPage() {
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
        description="Cadastre os médicos responsáveis pelos lançamentos administrativos de internações. A quantidade de registros representa volume administrativo, não qualidade clínica."
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
