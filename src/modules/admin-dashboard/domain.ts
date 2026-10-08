export function monthName(month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(2020, month - 1, 1)))
    .replace(".", "");
}

export function formatCurrency(cents: bigint): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents) / 100);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function getProductionForMonth(
  entries: readonly {
    procedure_id: string;
    procedure_name: string;
    counting_unit: string;
    reference_period: string;
    quantity: string;
  }[],
  year: number,
  month: number,
) {
  const competence = `${year}-${String(month).padStart(2, "0")}`;
  const grouped = new Map<
    string,
    { name: string; unit: string; quantity: number }
  >();
  for (const entry of entries) {
    if (entry.reference_period.slice(0, 7) !== competence) continue;
    const key = `${entry.procedure_id}:${entry.counting_unit}`;
    const current = grouped.get(key);
    if (current) current.quantity += Number(entry.quantity);
    else
      grouped.set(key, {
        name: entry.procedure_name,
        unit: entry.counting_unit,
        quantity: Number(entry.quantity),
      });
  }
  return [...grouped.entries()]
    .map(([key, value]) => ({ id: key, ...value }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function summarizeSurgeryDays(days: readonly SurgeryDaySummary[]) {
  return days.reduce(
    (summary, day) => ({
      occupied: summary.occupied + day.occupied,
      capacity: summary.capacity + day.capacity,
      awaiting: summary.awaiting + day.awaitingConfirmation,
      confirmed: summary.confirmed + day.confirmed,
    }),
    { occupied: 0, capacity: 0, awaiting: 0, confirmed: 0 },
  );
}
import type { SurgeryDaySummary } from "@/modules/minor-surgeries/domain";
