import { summarizeAdmissionTotals } from "../admissions/domain";
import {
  getAdmissionDashboardTotals,
  listAdmissionTargets,
} from "../admissions/repository";

export async function loadAdmissionDashboard(input: {
  startDate: string;
  endDate: string;
  year: number;
  month: number;
  today: Date;
}) {
  try {
    const [totals, targets] = await Promise.all([
      getAdmissionDashboardTotals(input.startDate, input.endDate),
      listAdmissionTargets(input.startDate, input.endDate),
    ]);

    return {
      kind: "available" as const,
      dashboard: summarizeAdmissionTotals(
        totals,
        targets,
        input.year,
        input.month,
        input.today,
      ),
    };
  } catch {
    return { kind: "unavailable" as const };
  }
}
