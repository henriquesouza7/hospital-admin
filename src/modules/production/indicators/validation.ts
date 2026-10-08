import { z } from "zod";
import { currentProductionCompetence } from "../domain";

const monthSchema = z.string().regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, {
  message: "Informe uma competência mensal válida.",
});
const yearSchema = z.string().regex(/^(19|20)\d{2}$/, {
  message: "Informe um ano válido.",
});
const uuidOrEmptySchema = z.union([z.string().uuid(), z.literal("")]);

const filterSchema = z
  .object({
    mode: z.enum(["competencia", "intervalo", "ano"]).optional(),
    competence: z.union([monthSchema, z.literal("")]).optional(),
    from: z.union([monthSchema, z.literal("")]).optional(),
    to: z.union([monthSchema, z.literal("")]).optional(),
    year: z.union([yearSchema, z.literal("")]).optional(),
    categoryId: uuidOrEmptySchema.optional(),
    procedureId: uuidOrEmptySchema.optional(),
    source: z.union([z.string().trim().max(80), z.literal("")]).optional(),
  })
  .superRefine((filters, context) => {
    if (filters.mode === "intervalo") {
      if (!filters.from) {
        context.addIssue({
          code: "custom",
          path: ["from"],
          message: "Informe o início do intervalo.",
        });
      }
      if (!filters.to) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message: "Informe o fim do intervalo.",
        });
      }
      if (filters.from && filters.to && filters.from > filters.to) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message: "O fim do intervalo deve ser igual ou posterior ao início.",
        });
      }
    }
    if (filters.mode === "competencia" && !filters.competence) {
      context.addIssue({
        code: "custom",
        path: ["competence"],
        message: "Informe a competência mensal.",
      });
    }
    if (filters.mode === "ano" && !filters.year) {
      context.addIssue({
        code: "custom",
        path: ["year"],
        message: "Informe o ano.",
      });
    }
  });

export type ProductionIndicatorFilters = Readonly<{
  mode: "competencia" | "intervalo" | "ano";
  competence: string;
  from: string;
  to: string;
  year: string;
  categoryId: string;
  procedureId: string;
  source: string;
}>;

export type ProductionIndicatorFilterResult = Readonly<{
  filters: ProductionIndicatorFilters;
  error?: string;
}>;

export function defaultProductionIndicatorFilters(
  date = new Date(),
): ProductionIndicatorFilters {
  const competence = currentProductionCompetence(date);
  return {
    mode: "competencia",
    competence,
    from: competence,
    to: competence,
    year: competence.slice(0, 4),
    categoryId: "",
    procedureId: "",
    source: "",
  };
}

export function parseProductionIndicatorFilters(
  params: Record<string, string | string[] | undefined>,
  date = new Date(),
): ProductionIndicatorFilterResult {
  const fallback = defaultProductionIndicatorFilters(date);
  const parsed = filterSchema.safeParse({
    mode: params.visao,
    competence: params.competencia,
    from: params.de,
    to: params.ate,
    year: params.ano,
    categoryId: params.categoria,
    procedureId: params.procedimento,
    source: params.origem,
  });

  if (!parsed.success) {
    return {
      filters: fallback,
      error:
        parsed.error.issues[0]?.message ??
        "Os filtros informados são inválidos.",
    };
  }

  return {
    filters: {
      mode: parsed.data.mode ?? fallback.mode,
      competence: parsed.data.competence || fallback.competence,
      from: parsed.data.from || fallback.from,
      to: parsed.data.to || fallback.to,
      year: parsed.data.year || fallback.year,
      categoryId: parsed.data.categoryId || "",
      procedureId: parsed.data.procedureId || "",
      source: parsed.data.source || "",
    },
  };
}
