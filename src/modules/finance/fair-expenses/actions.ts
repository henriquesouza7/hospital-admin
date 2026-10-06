"use server";

import { revalidatePath } from "next/cache";
import type { FinanceActionState } from "@/modules/finance/pharmacy/action-state";
import {
  createFairExpense,
  DuplicateFairCompetenceError,
  updateFairExpense,
} from "./repository";
import { parseFairExpenseForm, parseFairExpenseUpdateForm } from "./validation";

function errorState(message: string): FinanceActionState {
  return { status: "error", message };
}

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

export async function createFairExpenseAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = parseFairExpenseForm(formData);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "competence")
      return errorState("Informe uma competência válida.");
    if (field === "total_amount") {
      return errorState(
        "Informe um total não negativo, com até duas casas decimais.",
      );
    }
    return errorState("A observação deve ter até 1.000 caracteres.");
  }

  try {
    await createFairExpense(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateFairCompetenceError) {
      return errorState(error.message);
    }
    return errorState("Não foi possível salvar o registro. Tente novamente.");
  }

  revalidatePath("/financeiro/feira");
  return { status: "success", message: "Registro mensal salvo." };
}

export async function updateFairExpenseAction(
  _previous: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = parseFairExpenseUpdateForm(formData);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "total_amount") {
      return errorState(
        "Informe um total não negativo, com até duas casas decimais.",
      );
    }
    if (field === "notes") {
      return errorState("A observação deve ter até 1.000 caracteres.");
    }
    return errorState("Não foi possível identificar o registro da Feira.");
  }

  try {
    await updateFairExpense({
      id: value(formData, "id"),
      total_amount: parsed.data.total_amount,
      notes: parsed.data.notes,
    });
  } catch {
    return errorState(
      "Não foi possível atualizar o registro. Tente novamente.",
    );
  }

  revalidatePath("/financeiro/feira");
  return { status: "success", message: "Registro atualizado." };
}
