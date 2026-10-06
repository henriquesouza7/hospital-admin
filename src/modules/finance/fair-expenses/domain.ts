import { formatCurrency } from "../pharmacy/format";

export type FairExpense = Readonly<{
  id: string;
  competence: string;
  total_amount: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}>;

export type MonthlyComparison = Readonly<{
  differenceCents: bigint;
  percentageBasisPoints: bigint | null;
}>;

export type AnnualComparison =
  | Readonly<{
      status: "no_current_data";
      previousYear: number;
    }>
  | Readonly<{
      status: "incomplete_previous";
      previousYear: number;
      currentCents: bigint;
      expectedMonths: number;
      availableMonths: number;
    }>
  | Readonly<{
      status: "comparable";
      previousYear: number;
      currentCents: bigint;
      previousCents: bigint;
      differenceCents: bigint;
      percentageBasisPoints: bigint | null;
      monthCount: number;
      competences: readonly string[];
    }>;

function decimalToCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

function percentageForDifference(
  differenceCents: bigint,
  previousCents: bigint,
): bigint | null {
  if (previousCents === BigInt(0)) return null;

  const absoluteDifference =
    differenceCents < 0 ? -differenceCents : differenceCents;
  const absolutePercentage =
    (absoluteDifference * BigInt(10000) + previousCents / BigInt(2)) /
    previousCents;

  return differenceCents < 0 ? -absolutePercentage : absolutePercentage;
}

export function previousCompetence(competence: string): string {
  const [year, month] = competence.slice(0, 7).split("-").map(Number);
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

export function calculateMonthlyComparison(
  current: FairExpense,
  previous: FairExpense | undefined,
): MonthlyComparison | null {
  if (!previous) return null;

  const currentCents = decimalToCents(current.total_amount);
  const previousCents = decimalToCents(previous.total_amount);
  const differenceCents = currentCents - previousCents;
  const percentageBasisPoints = percentageForDifference(
    differenceCents,
    previousCents,
  );

  return { differenceCents, percentageBasisPoints };
}

export function formatPercentage(basisPoints: bigint): string {
  const absolute = basisPoints < 0 ? -basisPoints : basisPoints;
  const sign = basisPoints > 0 ? "+" : basisPoints < 0 ? "−" : "";
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${sign}${whole},${fraction}%`;
}

export function formatDifference(cents: bigint): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  const absolute = cents < 0 ? -cents : cents;
  return `${sign}${formatCurrency(absolute)}`;
}

export function getAnnualSummary(
  expenses: readonly FairExpense[],
  year: number,
) {
  const yearPrefix = `${year}-`;
  const annualExpenses = expenses.filter((expense) =>
    expense.competence.startsWith(yearPrefix),
  );
  const totalCents = annualExpenses.reduce(
    (total, expense) => total + decimalToCents(expense.total_amount),
    BigInt(0),
  );
  const monthCount = annualExpenses.length;
  const averageCents =
    monthCount === 0
      ? BigInt(0)
      : (totalCents + BigInt(Math.floor(monthCount / 2))) / BigInt(monthCount);

  return { totalCents, averageCents, monthCount };
}

export function calculateAnnualComparison(
  expenses: readonly FairExpense[],
  year: number,
): AnnualComparison {
  const currentPrefix = `${year}-`;
  const currentExpenses = expenses
    .filter((expense) => expense.competence.startsWith(currentPrefix))
    .sort((left, right) => left.competence.localeCompare(right.competence));
  const previousYear = year - 1;

  if (currentExpenses.length === 0) {
    return { status: "no_current_data", previousYear };
  }

  const currentCents = currentExpenses.reduce(
    (total, expense) => total + decimalToCents(expense.total_amount),
    BigInt(0),
  );
  const previousByMonth = new Map(
    expenses
      .filter((expense) => expense.competence.startsWith(`${previousYear}-`))
      .map((expense) => [expense.competence.slice(5, 7), expense]),
  );
  const currentMonths = currentExpenses.map((expense) =>
    expense.competence.slice(5, 7),
  );
  const previousExpenses = currentMonths.map((month) =>
    previousByMonth.get(month),
  );
  const availableMonths = previousExpenses.filter(Boolean).length;

  if (availableMonths !== currentExpenses.length) {
    return {
      status: "incomplete_previous",
      previousYear,
      currentCents,
      expectedMonths: currentExpenses.length,
      availableMonths,
    };
  }

  const previousCents = previousExpenses.reduce(
    (total, expense) =>
      total + (expense ? decimalToCents(expense.total_amount) : BigInt(0)),
    BigInt(0),
  );
  const differenceCents = currentCents - previousCents;

  return {
    status: "comparable",
    previousYear,
    currentCents,
    previousCents,
    differenceCents,
    percentageBasisPoints: percentageForDifference(
      differenceCents,
      previousCents,
    ),
    monthCount: currentExpenses.length,
    competences: currentExpenses.map((expense) =>
      expense.competence.slice(0, 7),
    ),
  };
}

export function formatCompetence(competence: string): string {
  const [year, month] = competence.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} de ${year}`;
}

export function currentCompetence(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
  return formatted.slice(0, 7);
}
