import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  AdmissionCsvImportForm,
  AdmissionEntriesTable,
  AdmissionEntryCreateForm,
} from "@/modules/admissions/admission-management";
import {
  listAdmissionEntries,
  listDoctors,
} from "@/modules/admissions/repository";
import { parseYearMonth, saoPauloToday } from "@/modules/admissions/period";

export const dynamic = "force-dynamic";
type PageProps = Readonly<{
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
  }>;
}>;

export default async function AdmissionEntriesPage({
  searchParams,
}: PageProps) {
  const { year, month } = parseYearMonth(await searchParams);
  const doctors = await listDoctors();
  const entries = await listAdmissionEntries(
    `${year}-${String(month).padStart(2, "0")}-01`,
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
  const today = saoPauloToday();
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Internações"
        title="Lançamentos"
        description="Registros agregados por data, médico responsável e quantidade. A data define automaticamente a competência mensal e anual."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/internacoes"
          >
            Dashboard
          </Link>
        }
      />
      <form
        method="get"
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Ano
          <input
            name="year"
            type="number"
            min="1900"
            max="2100"
            defaultValue={year}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <input
            name="month"
            type="number"
            min="1"
            max="12"
            defaultValue={month}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <Button type="submit" variant="outline">
          Aplicar período
        </Button>
      </form>
      <AdmissionEntryCreateForm
        doctors={doctors}
        defaultDate={today.toISOString().slice(0, 10)}
      />
      <AdmissionEntriesTable entries={entries} />
      <AdmissionCsvImportForm />
      <p className="text-sm text-muted-foreground">
        Editar um lançamento altera somente a quantidade. Médico e data
        permanecem vinculados ao registro histórico; alterações efetivas ficam
        na auditoria.
      </p>
    </div>
  );
}
