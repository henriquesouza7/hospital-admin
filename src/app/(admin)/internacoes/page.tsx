import { PageHeader } from "@/components/page-header";
import { summarizeAdmissions } from "@/modules/admissions/domain";
import { AdmissionsDashboardView } from "@/modules/admissions/dashboard-view";
import {
  listAdmissionEntries,
  listAdmissionTargets,
} from "@/modules/admissions/repository";
import { parseYearMonth } from "@/modules/admissions/period";

export const dynamic = "force-dynamic";

type AdmissionsPageProps = Readonly<{
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
  }>;
}>;

export default async function AdmissionsPage({
  searchParams,
}: AdmissionsPageProps) {
  const period = parseYearMonth(await searchParams);
  const startDate = `${period.year}-01-01`;
  const endDate = `${period.year + 1}-01-01`;
  const [entries, targets] = await Promise.all([
    listAdmissionEntries(startDate, endDate),
    listAdmissionTargets(startDate, endDate),
  ]);
  const dashboard = summarizeAdmissions(
    entries,
    targets,
    period.year,
    period.month,
    period.today,
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Internações"
        title="Dashboard"
        description="Acompanhe lançamentos administrativos agregados, totais hospitalares e evolução por período. Os valores representam volume, não qualidade clínica."
      />
      <AdmissionsDashboardView
        dashboard={dashboard}
        selectedMonth={period.month}
      />
    </div>
  );
}
