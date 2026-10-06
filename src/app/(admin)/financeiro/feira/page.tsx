import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/modules/finance/pharmacy/format";
import {
  calculateAnnualComparison,
  currentCompetence,
  formatDifference,
  formatPercentage,
  getAnnualSummary,
  type AnnualComparison,
  type FairExpense,
} from "@/modules/finance/fair-expenses/domain";
import { listFairExpenses } from "@/modules/finance/fair-expenses/repository";
import {
  FairExpenseCreateForm,
  FairExpenseHistory,
} from "@/modules/finance/fair-expenses/fair-expense-management";

type MarketPageProps = Readonly<{
  searchParams: Promise<{ ano?: string | string[] }>;
}>;

function parseYear(value: string | string[] | undefined, fallback: number) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) return fallback;
  const year = Number(value);
  return year >= 1900 && year <= 2099 ? year : fallback;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const params = await searchParams;
  const defaultYear = Number(currentCompetence().slice(0, 4));
  const selectedYear = parseYear(params.ano, defaultYear);
  let expenses: FairExpense[] = [];
  let loadError = false;

  try {
    expenses = await listFairExpenses();
  } catch {
    loadError = true;
  }

  const annualSummary = getAnnualSummary(expenses, selectedYear);
  const annualComparison = calculateAnnualComparison(expenses, selectedYear);
  const years = [
    ...new Set([
      defaultYear,
      selectedYear,
      ...expenses.map((expense) => Number(expense.competence.slice(0, 4))),
    ]),
  ].sort((left, right) => right - left);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Feira"
        description="Registre o total mensal consolidado e acompanhe o histórico de despesas."
        actions={
          <Button nativeButton={false} render={<Link href="#novo-registro" />}>
            <Plus aria-hidden="true" />
            Registrar mês
          </Button>
        }
      />

      <FairExpenseCreateForm defaultCompetence={currentCompetence()} />

      <section className="space-y-4" aria-labelledby="annual-summary-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="annual-summary-title" className="text-lg font-semibold">
              Resumo anual
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A média considera somente os meses registrados.
            </p>
          </div>
          <form
            action="/financeiro/feira"
            method="get"
            className="flex items-end gap-2"
          >
            <label className="grid gap-1 text-sm font-medium" htmlFor="ano">
              Ano
              <select
                id="ano"
                name="ano"
                defaultValue={String(selectedYear)}
                className="h-9 rounded-lg border bg-background px-3 font-normal"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline" size="sm">
              Consultar
            </Button>
          </form>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label={`Total registrado em ${selectedYear}`}
            value={formatCurrency(annualSummary.totalCents)}
          />
          <SummaryCard
            label="Média por mês registrado"
            value={formatCurrency(annualSummary.averageCents)}
          />
          <SummaryCard
            label="Meses registrados"
            value={String(annualSummary.monthCount)}
          />
        </div>
        <AnnualComparisonCard
          comparison={annualComparison}
          selectedYear={selectedYear}
        />
      </section>

      <section className="space-y-4" aria-labelledby="history-title">
        <div>
          <h2 id="history-title" className="text-lg font-semibold">
            Histórico mensal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Os registros aparecem do mais recente para o mais antigo.
          </p>
        </div>
        {loadError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm"
          >
            Não foi possível carregar o histórico da Feira. Tente novamente.
          </div>
        ) : (
          <FairExpenseHistory expenses={expenses} />
        )}
      </section>
    </div>
  );
}

function AnnualComparisonCard({
  comparison,
  selectedYear,
}: {
  comparison: AnnualComparison;
  selectedYear: number;
}) {
  return (
    <article className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h3 className="font-semibold">Comparação ano a ano</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A comparação usa os mesmos meses registrados no ano selecionado.
        </p>
      </div>
      {comparison.status === "no_current_data" ? (
        <p className="text-sm text-muted-foreground">
          Sem meses registrados em {selectedYear} para comparar com{" "}
          {comparison.previousYear}.
        </p>
      ) : comparison.status === "incomplete_previous" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Sem período equivalente suficiente em {comparison.previousYear}: há{" "}
          {comparison.availableMonths} de {comparison.expectedMonths} meses
          necessários.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ComparisonValue
            label={`Total nos meses registrados em ${selectedYear}`}
            value={formatCurrency(comparison.currentCents)}
          />
          <ComparisonValue
            label={`Total nos mesmos meses de ${comparison.previousYear}`}
            value={formatCurrency(comparison.previousCents)}
          />
          <ComparisonValue
            label="Diferença"
            value={formatDifference(comparison.differenceCents)}
          />
          <ComparisonValue
            label="Variação e meses comparados"
            value={
              comparison.percentageBasisPoints === null
                ? `Percentual indisponível (período anterior sem valor) · ${comparison.monthCount} meses`
                : `${formatPercentage(comparison.percentageBasisPoints)} · ${comparison.monthCount} meses`
            }
          />
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Meses comparados: {formatComparedMonths(comparison.competences)}.
          </p>
        </div>
      )}
    </article>
  );
}

function ComparisonValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatComparedMonths(competences: readonly string[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });

  return competences
    .map((competence) => {
      const [year, month] = competence.split("-").map(Number);
      return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
    })
    .join(", ");
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}
