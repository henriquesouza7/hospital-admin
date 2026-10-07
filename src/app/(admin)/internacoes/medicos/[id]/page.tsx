import { notFound } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { AdmissionDashboardChart } from "@/modules/admissions/admission-dashboard-chart";
import { AdmissionEntriesTable } from "@/modules/admissions/admission-management";
import { summarizeAdmissions } from "@/modules/admissions/domain";
import {
  listAdmissionEntries,
  listDoctors,
} from "@/modules/admissions/repository";
import { parseYearMonth } from "@/modules/admissions/period";

export const dynamic = "force-dynamic";
type PageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
  }>;
}>;

export default async function AdmissionDoctorPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, period] = await Promise.all([
    params,
    searchParams.then(parseYearMonth),
  ]);
  const doctors = await listDoctors();
  const doctor = doctors.find((item) => item.id === id);
  if (!doctor) notFound();
  const entries = await listAdmissionEntries(
    `${period.year}-01-01`,
    `${period.year + 1}-01-01`,
    id,
  );
  const dashboard = summarizeAdmissions(
    entries,
    [],
    period.year,
    period.month,
    period.today,
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Internações · Médico"
        title={doctor.name}
        description={`${doctor.active ? "Cadastro ativo" : "Cadastro inativo"}. Histórico administrativo agregado por data e quantidade; sem dados clínicos ou individuais.`}
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/internacoes"
          >
            Voltar ao dashboard
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
            defaultValue={period.year}
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
            defaultValue={period.month}
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <Button type="submit" variant="outline">
          Aplicar período
        </Button>
      </form>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Total anual · {period.year}
          </p>
          <p className="mt-4 text-3xl font-semibold">{dashboard.annualTotal}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Internações lançadas para este médico no ano.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Total do mês
          </p>
          <p className="mt-4 text-3xl font-semibold">
            {dashboard.monthlyTotal}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Período {dashboard.elapsedDays}/{dashboard.daysInMonth} dias ·{" "}
            {dashboard.periodStatus === "in_progress"
              ? "em andamento"
              : dashboard.periodStatus === "closed"
                ? "encerrado"
                : "futuro"}
            .
          </p>
        </article>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Evolução mensal · {period.year}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quantidade administrativa por mês; meses encerrados aparecem em azul.
        </p>
        <div className="mt-4">
          <AdmissionDashboardChart dashboard={dashboard} />
        </div>
      </section>
      <section className="grid gap-3">
        <h2 className="font-semibold">Lançamentos deste médico</h2>
        <AdmissionEntriesTable
          entries={entries.filter(
            (entry) => Number(entry.entry_date.slice(5, 7)) === period.month,
          )}
        />
      </section>
    </div>
  );
}
