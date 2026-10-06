import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireFinanceAdmin } from "@/modules/finance/pharmacy/access";
import type { FairExpense } from "./domain";

const amountSchema = z.union([z.string(), z.number()]).transform(String);
const fairExpenseRowSchema = z.object({
  id: z.string().uuid(),
  competence: z.iso.date(),
  total_amount: amountSchema,
  notes: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
const fairExpensesSchema = z.array(fairExpenseRowSchema);

export class DuplicateFairCompetenceError extends Error {
  constructor() {
    super("Já existe um registro para essa competência.");
    this.name = "DuplicateFairCompetenceError";
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

export async function listFairExpenses(): Promise<FairExpense[]> {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("monthly_fair_expenses")
    .select("id,competence,total_amount,notes,created_at,updated_at")
    .order("competence", { ascending: false });

  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar o histórico da Feira.");
  }
  return fairExpensesSchema.parse(data);
}

export async function createFairExpense(input: {
  competence: string;
  total_amount: string;
  notes: string | null;
}) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "create_monthly_fair_expense",
    {
      p_competence: input.competence,
      p_total_amount: input.total_amount,
      p_notes: input.notes,
    },
  );

  if (error) {
    if (errorCode(error) === "23505") throw new DuplicateFairCompetenceError();
    throw new Error("Não foi possível salvar o registro da Feira.");
  }
  if (!z.string().uuid().safeParse(data).success) {
    throw new Error("Não foi possível confirmar o registro da Feira.");
  }
}

export async function updateFairExpense(input: {
  id: string;
  total_amount: string;
  notes: string | null;
}) {
  await requireFinanceAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "update_monthly_fair_expense",
    {
      p_id: input.id,
      p_total_amount: input.total_amount,
      p_notes: input.notes,
    },
  );

  if (error || data !== true) {
    throw new Error("Não foi possível atualizar o registro da Feira.");
  }
}
