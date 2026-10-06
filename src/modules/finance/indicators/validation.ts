import { z } from "zod";

export const MAX_INDICATOR_MONTHS = 24;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const sectorSchema = z.enum(["todos", "farmacia", "laboratorio"]);

export type IndicatorsFilters = Readonly<{
  inicio: string;
  fim: string;
  setor: z.infer<typeof sectorSchema>;
  produto: string;
}>;

export type IndicatorsFiltersResult =
  | { success: true; data: IndicatorsFilters }
  | { success: false; message: string; fallback: IndicatorsFilters };

type SearchValues = Readonly<{
  inicio?: string | string[];
  fim?: string | string[];
  setor?: string | string[];
  produto?: string | string[];
}>;

function currentMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function fallbackFilters(now: Date): IndicatorsFilters {
  const end = currentMonth(now);
  const [year, month] = end.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 12, 1));
  const start = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}`;
  return { inicio: start, fim: end, setor: "todos", produto: "" };
}

function monthDistance(start: string, end: string): number {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  return (endYear - startYear) * 12 + endMonth - startMonth + 1;
}

export function parseIndicatorsFilters(
  values: SearchValues,
  now = new Date(),
): IndicatorsFiltersResult {
  const fallback = fallbackFilters(now);
  const hasStart = values.inicio !== undefined;
  const hasEnd = values.fim !== undefined;
  if (hasStart !== hasEnd) {
    return {
      success: false,
      message: "Informe início e fim do período.",
      fallback,
    };
  }

  const parsed = z
    .object({
      inicio: monthSchema.default(fallback.inicio),
      fim: monthSchema.default(fallback.fim),
      setor: sectorSchema.default("todos"),
      produto: z.string().uuid().or(z.literal("")).default(""),
    })
    .safeParse({
      inicio: hasStart ? values.inicio : undefined,
      fim: hasEnd ? values.fim : undefined,
      setor: values.setor,
      produto: values.produto,
    });

  if (!parsed.success) {
    return {
      success: false,
      message: "Os filtros informados são inválidos.",
      fallback,
    };
  }
  if (parsed.data.inicio > parsed.data.fim) {
    return {
      success: false,
      message: "O início do período deve ser anterior ao fim.",
      fallback,
    };
  }
  if (
    monthDistance(parsed.data.inicio, parsed.data.fim) > MAX_INDICATOR_MONTHS
  ) {
    return {
      success: false,
      message: `O período pode conter no máximo ${MAX_INDICATOR_MONTHS} meses.`,
      fallback,
    };
  }

  return { success: true, data: parsed.data };
}
