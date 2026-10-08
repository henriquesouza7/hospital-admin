export type ProcedureCategory = Readonly<{
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}>;

export type ProductionProcedure = Readonly<{
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  counting_unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}>;

export type ProductionEntry = Readonly<{
  id: string;
  procedure_id: string;
  procedure_name: string;
  category_name: string;
  counting_unit: string;
  reference_period: string;
  quantity: string;
  source: string;
  created_at: string;
  updated_at: string;
}>;

export function formatProductionCompetence(value: string): string {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function currentProductionCompetence(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  })
    .format(date)
    .slice(0, 7);
}
