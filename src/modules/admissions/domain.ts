export type Doctor = Readonly<{
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}>;

export type AdmissionEntry = Readonly<{
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_active: boolean;
  entry_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}>;

export type AdmissionTarget = Readonly<{
  id: string;
  period_type: "month" | "year";
  reference_period: string;
  target_quantity: number;
  created_at: string;
  updated_at: string;
}>;

export type AdmissionDashboard = Readonly<{
  year: number;
  month: number;
  monthlyTotal: number;
  annualTotal: number;
  monthTarget: number | null;
  yearTarget: number | null;
  elapsedDays: number;
  daysInMonth: number;
  daysInYear: number;
  periodStatus: "in_progress" | "closed" | "future";
  byDoctor: readonly Readonly<{
    doctorId: string;
    doctorName: string;
    active: boolean;
    quantity: number;
  }>[];
  monthlyEvolution: readonly Readonly<{
    month: number;
    quantity: number;
    isCurrentMonth: boolean;
    isClosed: boolean;
  }>[];
}>;

export function summarizeAdmissions(
  entries: readonly AdmissionEntry[],
  targets: readonly AdmissionTarget[],
  year: number,
  month: number,
  today: Date,
): AdmissionDashboard {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthEntries = entries.filter((entry) =>
    entry.entry_date.startsWith(monthKey),
  );
  const yearEntries = entries.filter((entry) =>
    entry.entry_date.startsWith(`${year}-`),
  );
  const monthTarget =
    targets.find(
      (target) =>
        target.period_type === "month" &&
        target.reference_period === `${monthKey}-01`,
    )?.target_quantity ?? null;
  const yearTarget =
    targets.find(
      (target) =>
        target.period_type === "year" &&
        target.reference_period === `${year}-01-01`,
    )?.target_quantity ?? null;
  const byDoctorMap = new Map<
    string,
    { doctorName: string; active: boolean; quantity: number }
  >();
  for (const entry of yearEntries) {
    const current = byDoctorMap.get(entry.doctor_id);
    if (current) current.quantity += entry.quantity;
    else
      byDoctorMap.set(entry.doctor_id, {
        doctorName: entry.doctor_name,
        active: entry.doctor_active,
        quantity: entry.quantity,
      });
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInYear =
    (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  const elapsedDays =
    year < today.getUTCFullYear() ||
    (year === today.getUTCFullYear() && month < today.getUTCMonth() + 1)
      ? daysInMonth
      : year === today.getUTCFullYear() && month === today.getUTCMonth() + 1
        ? Math.min(today.getUTCDate(), daysInMonth)
        : 0;
  const periodStatus =
    year < today.getUTCFullYear() ||
    (year === today.getUTCFullYear() && month < today.getUTCMonth() + 1)
      ? "closed"
      : year === today.getUTCFullYear() && month === today.getUTCMonth() + 1
        ? "in_progress"
        : "future";
  const monthlyEvolution = Array.from({ length: 12 }, (_, index) => {
    const currentMonth = index + 1;
    return {
      month: currentMonth,
      quantity: yearEntries
        .filter(
          (entry) => Number(entry.entry_date.slice(5, 7)) === currentMonth,
        )
        .reduce((sum, entry) => sum + entry.quantity, 0),
      isCurrentMonth:
        year === today.getUTCFullYear() &&
        currentMonth === today.getUTCMonth() + 1,
      isClosed:
        year < today.getUTCFullYear() ||
        (year === today.getUTCFullYear() &&
          currentMonth < today.getUTCMonth() + 1),
    };
  });
  return {
    year,
    month,
    monthlyTotal: monthEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    annualTotal: yearEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    monthTarget,
    yearTarget,
    elapsedDays,
    daysInMonth,
    daysInYear,
    periodStatus,
    byDoctor: [...byDoctorMap.entries()]
      .map(([doctorId, value]) => ({ doctorId, ...value }))
      .sort((left, right) =>
        left.doctorName.localeCompare(right.doctorName, "pt-BR"),
      ),
    monthlyEvolution,
  };
}
